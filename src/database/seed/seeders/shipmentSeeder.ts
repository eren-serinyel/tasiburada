import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Shipment, ShipmentStatus, ShipmentCategory, PlaceType, InsuranceType } from '../../../domain/entities/Shipment';
import { Customer } from '../../../domain/entities/Customer';
import { Carrier } from '../../../domain/entities/Carrier';
import { VehicleType } from '../../../domain/entities/VehicleType';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { LOAD_TYPES, CITIES } from '../data/constants';
import {
  randomFrom, randomInt, randomFloat,
  randomPastDate, randomFutureDate,
  pickRandom, generatePhone,
  randomDistrict,
} from '../helpers/seedHelpers';

export async function seedShipments(
  customers: Customer[],
  carriers: Carrier[],
  vehicleTypeMap: Map<string, string>,
  extraServiceMap: Map<string, string>,
): Promise<Shipment[]> {
  const repo = AppDataSource.getRepository(Shipment);
  const vtRepo = AppDataSource.getRepository(VehicleType);
  const extraRepo = AppDataSource.getRepository(ExtraService);
  const created: Shipment[] = [];

  const categories = [
    ShipmentCategory.HOME_MOVE,
    ShipmentCategory.HOME_MOVE,
    ShipmentCategory.HOME_MOVE,
    ShipmentCategory.OFFICE_MOVE,
    ShipmentCategory.PARTIAL_ITEM,
    ShipmentCategory.STORAGE,
  ];
  const placeTypes = [
    PlaceType.DAIRE,
    PlaceType.MUSTAKIL,
    PlaceType.VILLA,
    PlaceType.OFIS,
    PlaceType.DEPO,
    PlaceType.DIGER,
  ];
  const insuranceTypes = Object.values(InsuranceType);

  const vehicleTypes = await vtRepo.findBy({ id: In(Array.from(vehicleTypeMap.values())) });
  const activeVehicleTypes = vehicleTypes.filter(vt => vt.status === 'ACTIVE');
  const extraServiceEntities = await extraRepo.findBy({ id: In(Array.from(extraServiceMap.values())) });

  if (activeVehicleTypes.length === 0) {
    throw new Error('Shipment seeding durduruldu: aktif araç tipi bulunamadı.');
  }

  const scenarios = [
    { status: ShipmentStatus.COMPLETED, count: 80, useFutureDate: false, assigned: true, daysWindow: 60 },
    { status: ShipmentStatus.IN_TRANSIT, count: 15, useFutureDate: false, assigned: true, daysWindow: 7 },
    { status: ShipmentStatus.MATCHED, count: 20, useFutureDate: false, assigned: true, daysWindow: 10 },
    { status: ShipmentStatus.OFFER_RECEIVED, count: 35, useFutureDate: true, assigned: false, daysWindow: 20 },
    { status: ShipmentStatus.PENDING, count: 60, useFutureDate: true, assigned: false, daysWindow: 30 },
    { status: ShipmentStatus.CANCELLED, count: 10, useFutureDate: false, assigned: false, daysWindow: 30 },
  ];

  const usableCarriers = carriers.filter(c => c.verifiedByAdmin && c.isActive);
  if (usableCarriers.length < 2) {
    throw new Error('Shipment seeding durduruldu: kullanılabilir carrier sayısı yetersiz.');
  }

  for (const scenario of scenarios) {
    for (let i = 0; i < scenario.count; i++) {
      const customer = randomFrom(customers);
      const originCity = Math.random() < 0.5 ? 'İstanbul' : randomFrom(CITIES);
      const destinationCity = randomFrom(CITIES);
      const assignedCarrier = scenario.assigned ? randomFrom(usableCarriers) : null;

      const shipment = repo.create({
        id: randomUUID(),
        customerId: customer.id,
        carrierId: assignedCarrier?.id ?? null,
        status: scenario.status,
        shipmentCategory: randomFrom(categories),
        price: scenario.assigned ? randomFloat(1500, 12000) : null,
        originCity,
        originDistrict: randomDistrict(originCity),
        originPlaceType: randomFrom(placeTypes),
        originFloor: randomInt(0, 10),
        originHasElevator: Math.random() > 0.6,
        destinationCity,
        destinationDistrict: randomDistrict(destinationCity),
        destinationPlaceType: randomFrom(placeTypes),
        destinationFloor: randomInt(0, 10),
        destinationHasElevator: Math.random() > 0.6,
        loadDetails: randomFrom(LOAD_TYPES),
        insuranceType: randomFrom(insuranceTypes),
        timePreference: randomFrom(['Sabah', 'Öğlen', 'Akşam']),
        weight: randomFloat(100, 3000),
        estimatedWeight: Math.random() < 0.4 ? randomInt(500, 5000) : null,
        shipmentDate: scenario.useFutureDate ? randomFutureDate(scenario.daysWindow) : randomPastDate(scenario.daysWindow),
        photoUrls: [],
        note: scenario.status === ShipmentStatus.CANCELLED ? 'Müşteri plan değişikliği nedeniyle iptal etti.' : 'Seed ile oluşturulan tutarlı talep.',
        vehicleTypePreferenceId: randomFrom(activeVehicleTypes).id,
        contactPhone: customer.phone ?? generatePhone(),
        cancellationReason: scenario.status === ShipmentStatus.CANCELLED ? 'Müşteri iptal etti' : null,
      });

      const saved = await repo.save(shipment, { reload: false });

      const selectedExtras = pickRandom(extraServiceEntities, Math.min(extraServiceEntities.length, randomInt(1, 3)));
      if (selectedExtras.length > 0) {
        await AppDataSource.createQueryBuilder()
          .relation(Shipment, 'extraServices')
          .of(shipment.id)
          .add(selectedExtras.map(extra => extra.id));
      }

      created.push(saved);
    }
  }

  console.log(`  ✓ ${created.length} taşıma talebi oluşturuldu`);
  return created;
}
