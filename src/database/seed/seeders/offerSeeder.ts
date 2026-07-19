import { SeedDataSource as AppDataSource } from '../seedDataSource';
import { Repository } from 'typeorm';
import { Offer, OfferStatus } from '../../../domain/entities/Offer';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierVehicle } from '../../../domain/entities/CarrierVehicle';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { CarrierLoadTypeCapability } from '../../../domain/entities/CarrierLoadTypeCapability';
import { CarrierExtraServiceCapability } from '../../../domain/entities/CarrierExtraServiceCapability';
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';
import { CITIES, OFFER_MESSAGE_TEMPLATES } from '../data/constants';
import { inferExtraServiceLoadTypeFromShipmentCategory } from '../../../application/services/extra-services/extraServiceApplicability';
import {
  calculateShipmentBasePrice,
  pickRandom,
  randomFloat,
  randomFrom,
  randomInt,
} from '../helpers/seedHelpers';

export async function seedOffers(
  shipments: Shipment[],
  carriers: Carrier[],
): Promise<Offer[]> {
  const offerRepo = AppDataSource.getRepository(Offer);
  const shipmentRepo = AppDataSource.getRepository(Shipment);
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const vehicleRepo = AppDataSource.getRepository(CarrierVehicle);
  const activityRepo = AppDataSource.getRepository(CarrierActivity);
  const profileRepo = AppDataSource.getRepository(CarrierProfileStatus);
  const loadTypeCapabilityRepo = AppDataSource.getRepository(CarrierLoadTypeCapability);
  const extraCapabilityRepo = AppDataSource.getRepository(CarrierExtraServiceCapability);

  const created: Offer[] = [];
  const offerCounts: Record<string, number> = {};
  const activeVehicleCarrierIds = new Set(
    (await vehicleRepo.find()).filter((vehicle) => vehicle.isActive).map((vehicle) => vehicle.carrierId),
  );
  const activityCarrierIds = new Set((await activityRepo.find()).map((row) => row.carrierId));
  const profileCarrierIds = new Set((await profileRepo.find()).map((row) => row.carrierId));
  const loadTypeCapabilities = await loadTypeCapabilityRepo.find({ where: { isActive: true } });
  const extraServiceCapabilities = await extraCapabilityRepo.find({ where: { isActive: true } });
  let shipmentExtraServiceRows: Array<{ shipmentId: string; extraServiceId: string }> = [];
  try {
    shipmentExtraServiceRows = await AppDataSource.query(
      'SELECT `shipment_id` AS shipmentId, `extra_service_id` AS extraServiceId FROM `shipment_extra_services`',
    );
  } catch {
    shipmentExtraServiceRows = [];
  }

  const loadTypeMapByCarrier = new Map<string, Set<ExtraServiceLoadType>>();
  loadTypeCapabilities.forEach((item) => {
    const bucket = loadTypeMapByCarrier.get(item.carrierId) ?? new Set<ExtraServiceLoadType>();
    bucket.add(item.loadType);
    loadTypeMapByCarrier.set(item.carrierId, bucket);
  });

  const extraCapabilityMap = new Map<string, Set<string>>();
  extraServiceCapabilities.forEach((item) => {
    const key = `${item.carrierId}|${item.loadType}`;
    const bucket = extraCapabilityMap.get(key) ?? new Set<string>();
    bucket.add(item.extraServiceId);
    extraCapabilityMap.set(key, bucket);
  });

  const shipmentExtraServiceMap = new Map<string, Set<string>>();
  shipmentExtraServiceRows.forEach((row) => {
    const bucket = shipmentExtraServiceMap.get(row.shipmentId) ?? new Set<string>();
    bucket.add(row.extraServiceId);
    shipmentExtraServiceMap.set(row.shipmentId, bucket);
  });

  const usableCarriers = carriers.filter((carrier) =>
    carrier.verifiedByAdmin &&
    carrier.isActive &&
    activeVehicleCarrierIds.has(carrier.id) &&
    activityCarrierIds.has(carrier.id) &&
    profileCarrierIds.has(carrier.id),
  );

  if (usableCarriers.length < 10) {
    throw new Error('Offer seeding durduruldu: teklif verebilir carrier sayısı yetersiz.');
  }

  for (const shipment of shipments) {
    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(shipment.shipmentCategory);
    const requiredExtraServiceIds = shipmentExtraServiceMap.get(shipment.id) ?? new Set<string>();
    const capabilityFilteredCarriers = filterCarriersByCapabilities(
      usableCarriers,
      loadType,
      requiredExtraServiceIds,
      loadTypeMapByCarrier,
      extraCapabilityMap,
    );

    // NO FALLBACK: If no capable carriers, skip this shipment
    // This ensures data integrity: every offer matches carrier capabilities
    if (capabilityFilteredCarriers.length === 0) {
      continue;
    }

    await ensureAssignedCarrierIsCapable(shipment, capabilityFilteredCarriers, shipmentRepo);

    const offerCount = determineOfferCount(shipment.status, capabilityFilteredCarriers.length);
    if (offerCount === 0) {
      continue;
    }

    const candidateCarriers = capabilityFilteredCarriers;

    const offeringCarriers = pickOfferingCarriers(shipment, candidateCarriers, offerCount);
    const basePrice = Number(shipment.price ?? deriveBasePrice(shipment));
    const offersForShipment = offeringCarriers.map((carrier, index) => {
      const isAcceptedCarrier = shipment.carrierId === carrier.id;
      const status = determineOfferStatus(shipment.status, isAcceptedCarrier);
      const price = isAcceptedCarrier && shipment.price
        ? Number(shipment.price)
        : buildOfferPrice(basePrice, shipment, carrier, index);

      offerCounts[carrier.id] = (offerCounts[carrier.id] ?? 0) + 1;

      return offerRepo.create({
        shipmentId: shipment.id,
        carrierId: carrier.id,
        price,
        message: randomFrom(OFFER_MESSAGE_TEMPLATES),
        estimatedDuration: estimateDuration(shipment, carrier),
        status,
        hasSuspiciousContent: false,
      });
    });

    const savedOffers = await offerRepo.save(offersForShipment);
    created.push(...savedOffers);
  }

  for (const carrier of carriers) {
    await carrierRepo.update(carrier.id, { totalOffers: offerCounts[carrier.id] ?? 0 });
  }

  if (created.length === 0) {
    throw new Error('Offer seeding başarısız: hiç teklif oluşturulmadı.');
  }

  console.log(`  ✓ ${created.length} teklif oluşturuldu`);
  return created;
}

async function ensureAssignedCarrierIsCapable(
  shipment: Shipment,
  capableCarriers: Carrier[],
  shipmentRepo: Repository<Shipment>,
): Promise<void> {
  if (
    !shipment.carrierId ||
    ![
      ShipmentStatus.MATCHED,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.COMPLETED,
    ].includes(shipment.status)
  ) {
    return;
  }

  if (capableCarriers.some((carrier) => carrier.id === shipment.carrierId)) {
    return;
  }

  const replacement = randomFrom(capableCarriers);
  shipment.carrierId = replacement.id;
  await shipmentRepo.update(shipment.id, { carrierId: replacement.id });
}

function determineOfferCount(status: ShipmentStatus, carrierCount: number): number {
  if (status === ShipmentStatus.PENDING) {
    return Math.min(carrierCount, randomInt(0, 1));
  }

  if (status === ShipmentStatus.OFFER_RECEIVED) {
    return Math.min(carrierCount, randomInt(2, 5));
  }

  if (
    status === ShipmentStatus.MATCHED ||
    status === ShipmentStatus.IN_TRANSIT ||
    status === ShipmentStatus.COMPLETED
  ) {
    return Math.min(carrierCount, randomInt(2, 6));
  }

  return Math.min(carrierCount, randomInt(0, 3));
}

function pickOfferingCarriers(
  shipment: Shipment,
  carriers: Carrier[],
  offerCount: number,
): Carrier[] {
  const selected = pickRandom(carriers, offerCount);

  if (
    shipment.carrierId &&
    [
      ShipmentStatus.MATCHED,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.COMPLETED,
    ].includes(shipment.status) &&
    !selected.some((carrier) => carrier.id === shipment.carrierId)
  ) {
    const assignedCarrier = carriers.find((carrier) => carrier.id === shipment.carrierId);
    if (assignedCarrier) {
      selected[0] = assignedCarrier;
    }
  }

  return selected;
}

function determineOfferStatus(
  shipmentStatus: ShipmentStatus,
  isAcceptedCarrier: boolean,
): OfferStatus {
  if (
    shipmentStatus === ShipmentStatus.MATCHED ||
    shipmentStatus === ShipmentStatus.IN_TRANSIT ||
    shipmentStatus === ShipmentStatus.COMPLETED
  ) {
    if (isAcceptedCarrier) {
      return OfferStatus.ACCEPTED;
    }

    return randomFrom([OfferStatus.REJECTED, OfferStatus.WITHDRAWN, OfferStatus.REJECTED]);
  }

  if (shipmentStatus === ShipmentStatus.CANCELLED) {
    return randomFrom([OfferStatus.CANCELLED, OfferStatus.WITHDRAWN, OfferStatus.REJECTED]);
  }

  return OfferStatus.PENDING;
}

function deriveBasePrice(shipment: Shipment): number {
  const category = shipment.shipmentCategory ?? ShipmentCategory.PARTIAL_ITEM;
  const distanceBand = shipment.originCity === shipment.destinationCity
    ? 'intra_city'
    : CITIES.includes(shipment.originCity ?? '') && CITIES.includes(shipment.destinationCity ?? '')
      ? 'intercity'
      : 'long_haul';

  return calculateShipmentBasePrice({
    category,
    distanceBand,
    weightKg: Number(shipment.weight ?? shipment.estimatedWeight ?? 500),
    floorFactor: Number(shipment.originFloor ?? 0) + Number(shipment.destinationFloor ?? 0),
    extraServiceCount: 0,
  });
}

function buildOfferPrice(
  basePrice: number,
  shipment: Shipment,
  carrier: Carrier,
  offerIndex: number,
): number {
  const distanceMultiplier = shipment.originCity === shipment.destinationCity
    ? randomFloat(0.9, 1.12)
    : randomFloat(0.96, 1.28);
  const weight = Number(shipment.weight ?? shipment.estimatedWeight ?? 500);
  const weightMultiplier = weight > 5000
    ? randomFloat(1.08, 1.24)
    : weight > 2500
      ? randomFloat(1.02, 1.16)
      : randomFloat(0.92, 1.1);
  const carrierExperienceMultiplier = Number(carrier.completedShipments ?? 0) > 40
    ? randomFloat(1.02, 1.12)
    : randomFloat(0.94, 1.06);
  const competitiveOffset = 1 + (offerIndex * randomFloat(0.015, 0.045));

  return Math.max(
    750,
    Math.round((basePrice * distanceMultiplier * weightMultiplier * carrierExperienceMultiplier * competitiveOffset) / 10) * 10,
  );
}

function estimateDuration(shipment: Shipment, carrier: Carrier): number {
  if (shipment.originCity === shipment.destinationCity) {
    return shipment.shipmentCategory === ShipmentCategory.PARTIAL_ITEM
      ? randomInt(1, 2)
      : randomInt(1, 3);
  }

  const base = shipment.shipmentCategory === ShipmentCategory.PARTIAL_ITEM
    ? randomInt(2, 4)
    : shipment.shipmentCategory === ShipmentCategory.OFFICE_MOVE
      ? randomInt(3, 6)
      : randomInt(3, 7);
  const routeComplexity = Math.abs(
    String(shipment.originCity ?? '').length - String(shipment.destinationCity ?? '').length,
  ) % 3;
  const experiencedCarrierAdjustment = Number(carrier.completedShipments ?? 0) > 40 ? -1 : 0;

  return Math.max(2, base + routeComplexity + experiencedCarrierAdjustment);
}

function filterCarriersByCapabilities(
  carriers: Carrier[],
  loadType: ExtraServiceLoadType | null,
  requiredExtraServiceIds: Set<string>,
  loadTypeMapByCarrier: Map<string, Set<ExtraServiceLoadType>>,
  extraCapabilityMap: Map<string, Set<string>>,
): Carrier[] {
  if (!loadType) {
    return carriers;
  }

  return carriers.filter((carrier) => {
    const loadTypes = loadTypeMapByCarrier.get(carrier.id);
    if (!loadTypes || !loadTypes.has(loadType)) {
      return false;
    }

    if (requiredExtraServiceIds.size === 0) {
      return true;
    }

    const key = `${carrier.id}|${loadType}`;
    const extraCapabilities = extraCapabilityMap.get(key);
    if (!extraCapabilities) {
      return false;
    }

    for (const extraServiceId of requiredExtraServiceIds) {
      if (!extraCapabilities.has(extraServiceId)) {
        return false;
      }
    }

    return true;
  });
}
