import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Offer, OfferStatus } from '../../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierVehicle } from '../../../domain/entities/CarrierVehicle';
import { CarrierActivity } from '../../../domain/entities/CarrierActivity';
import { CarrierProfileStatus } from '../../../domain/entities/CarrierProfileStatus';
import { randomFloat, randomInt, randomFrom } from '../helpers/seedHelpers';

export async function seedOffers(
  shipments: Shipment[],
  carriers: Carrier[],
): Promise<Offer[]> {
  const repo = AppDataSource.getRepository(Offer);
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const vehicleRepo = AppDataSource.getRepository(CarrierVehicle);
  const activityRepo = AppDataSource.getRepository(CarrierActivity);
  const profileRepo = AppDataSource.getRepository(CarrierProfileStatus);

  const created: Offer[] = [];
  const activeVehicleCarrierIds = new Set((await vehicleRepo.find()).filter(vehicle => vehicle.isActive).map(vehicle => vehicle.carrierId));
  const activityCarrierIds = new Set((await activityRepo.find()).map(row => row.carrierId));
  const profileCarrierIds = new Set((await profileRepo.find()).map(row => row.carrierId));

  const usableCarriers = carriers.filter(carrier =>
    carrier.verifiedByAdmin &&
    carrier.isActive &&
    activeVehicleCarrierIds.has(carrier.id) &&
    activityCarrierIds.has(carrier.id) &&
    profileCarrierIds.has(carrier.id)
  );

  if (usableCarriers.length < 2) {
    throw new Error('Offer seeding durduruldu: usable carrier sayısı 2 altına düştü.');
  }

  const offerCounts: Record<string, number> = {};
  const messages = [
    'Sigortalı ve güvenli taşıma sunuyoruz.',
    'Deneyimli ekip ve zamanında teslimat garantisi.',
    'Profesyonel paketleme hizmeti dahildir.',
    'Bu rota için hızlı planlama yapabiliriz.',
  ];

  for (const shipment of shipments) {
    if (shipment.status === ShipmentStatus.CANCELLED || shipment.status === ShipmentStatus.PENDING) {
      continue;
    }

    const offerCount = Math.min(usableCarriers.length, randomInt(2, 5));
    const offeringCarriers = [...usableCarriers].sort(() => Math.random() - 0.5).slice(0, offerCount);

    if (
      (shipment.status === ShipmentStatus.MATCHED ||
        shipment.status === ShipmentStatus.IN_TRANSIT ||
        shipment.status === ShipmentStatus.COMPLETED) &&
      shipment.carrierId
    ) {
      const assigned = usableCarriers.find(carrier => carrier.id === shipment.carrierId);
      if (assigned && !offeringCarriers.some(carrier => carrier.id === assigned.id)) {
        offeringCarriers[0] = assigned;
      }
    }

    const basePrice = Number(shipment.price ?? randomFloat(1200, 8000));

    for (let i = 0; i < offeringCarriers.length; i++) {
      const carrier = offeringCarriers[i];
      const price = Math.round((basePrice * (0.9 + i * 0.05)) / 10) * 10;

      let status: OfferStatus = OfferStatus.PENDING;
      if (
        shipment.status === ShipmentStatus.MATCHED ||
        shipment.status === ShipmentStatus.IN_TRANSIT ||
        shipment.status === ShipmentStatus.COMPLETED
      ) {
        status = shipment.carrierId === carrier.id ? OfferStatus.ACCEPTED : OfferStatus.REJECTED;
      }

      created.push(await repo.save(repo.create({
        shipmentId: shipment.id,
        carrierId: carrier.id,
        price,
        message: randomFrom(messages),
        estimatedDuration: randomInt(2, 10),
        status,
        hasSuspiciousContent: false,
      })));

      offerCounts[carrier.id] = (offerCounts[carrier.id] ?? 0) + 1;
    }
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
