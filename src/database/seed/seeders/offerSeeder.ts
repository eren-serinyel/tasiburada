import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Offer, OfferStatus } from '../../../domain/entities/Offer';
import { Shipment, ShipmentCategory, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierVehicle } from '../../../domain/entities/CarrierVehicle';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { CITIES, OFFER_MESSAGE_TEMPLATES } from '../data/constants';
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
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const vehicleRepo = AppDataSource.getRepository(CarrierVehicle);
  const activityRepo = AppDataSource.getRepository(CarrierActivity);
  const profileRepo = AppDataSource.getRepository(CarrierProfileStatus);

  const created: Offer[] = [];
  const offerCounts: Record<string, number> = {};
  const activeVehicleCarrierIds = new Set(
    (await vehicleRepo.find()).filter((vehicle) => vehicle.isActive).map((vehicle) => vehicle.carrierId),
  );
  const activityCarrierIds = new Set((await activityRepo.find()).map((row) => row.carrierId));
  const profileCarrierIds = new Set((await profileRepo.find()).map((row) => row.carrierId));

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
    const offerCount = determineOfferCount(shipment.status, usableCarriers.length);
    if (offerCount === 0) {
      continue;
    }

    const offeringCarriers = pickOfferingCarriers(shipment, usableCarriers, offerCount);
    const basePrice = Number(shipment.price ?? deriveBasePrice(shipment));
    const offersForShipment = offeringCarriers.map((carrier, index) => {
      const isAcceptedCarrier = shipment.carrierId === carrier.id;
      const status = determineOfferStatus(shipment.status, isAcceptedCarrier);
      const price = isAcceptedCarrier && shipment.price
        ? Number(shipment.price)
        : Math.round((basePrice * randomFloat(0.8, 1.2)) / 10) * 10;

      offerCounts[carrier.id] = (offerCounts[carrier.id] ?? 0) + 1;

      return offerRepo.create({
        shipmentId: shipment.id,
        carrierId: carrier.id,
        price,
        message: randomFrom(OFFER_MESSAGE_TEMPLATES),
        estimatedDuration: estimateDuration(shipment),
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

function estimateDuration(shipment: Shipment): number {
  if (shipment.originCity === shipment.destinationCity) {
    return randomInt(1, 4);
  }

  if (shipment.shipmentCategory === ShipmentCategory.OFFICE_MOVE) {
    return randomInt(2, 6);
  }

  return randomInt(2, 8);
}
