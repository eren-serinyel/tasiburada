import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { AppDataSource } from '../../../infrastructure/database/data-source';
import {
  InsuranceType,
  PlaceType,
  Shipment,
  ShipmentCategory,
  ShipmentStatus,
} from '../../../domain/entities/Shipment';
import { Customer } from '../../../domain/entities/Customer';
import { Carrier } from '../../../domain/entities/Carrier';
import { VehicleType } from '../../../domain/entities/VehicleType';
import { ExtraService } from '../../../domain/entities/ExtraService';
import { LOAD_TYPES } from '../data/constants';
import {
  calculateShipmentBasePrice,
  chance,
  generatePhone,
  pickRandom,
  randomDestinationCity,
  randomDistanceBand,
  randomDistrict,
  randomFloat,
  randomFrom,
  randomFutureDateBetween,
  randomInt,
  randomPastDateBetween,
  randomWeightedCity,
  randomWeightedDate,
  ShipmentDistanceBand,
} from '../helpers/seedHelpers';

const CREATED_AT_WINDOWS = [
  { minDaysAgo: 0, maxDaysAgo: 30, weight: 25 },
  { minDaysAgo: 31, maxDaysAgo: 60, weight: 22 },
  { minDaysAgo: 61, maxDaysAgo: 90, weight: 18 },
  { minDaysAgo: 91, maxDaysAgo: 120, weight: 15 },
  { minDaysAgo: 121, maxDaysAgo: 150, weight: 12 },
  { minDaysAgo: 151, maxDaysAgo: 180, weight: 8 },
] as const;

const STATUS_COUNTS: Array<{ count: number; status: ShipmentStatus }> = [
  { status: ShipmentStatus.PENDING, count: 240 },
  { status: ShipmentStatus.OFFER_RECEIVED, count: 260 },
  { status: ShipmentStatus.MATCHED, count: 300 },
  { status: ShipmentStatus.IN_TRANSIT, count: 200 },
  { status: ShipmentStatus.COMPLETED, count: 900 },
  { status: ShipmentStatus.CANCELLED, count: 100 },
];

const CATEGORY_COUNTS: Array<{ category: ShipmentCategory; count: number }> = [
  { category: ShipmentCategory.HOME_MOVE, count: 1000 },
  { category: ShipmentCategory.OFFICE_MOVE, count: 300 },
  { category: ShipmentCategory.PARTIAL_ITEM, count: 600 },
  { category: ShipmentCategory.STORAGE, count: 100 },
];

const INSURANCE_WEIGHTS: Array<{ type: InsuranceType; weight: number }> = [
  { type: InsuranceType.NONE, weight: 60 },
  { type: InsuranceType.STANDARD, weight: 30 },
  { type: InsuranceType.COMPREHENSIVE, weight: 10 },
];

const PLACE_TYPE_GROUPS: Record<ShipmentCategory, Array<[PlaceType, PlaceType]>> = {
  [ShipmentCategory.HOME_MOVE]: [
    [PlaceType.DAIRE, PlaceType.DAIRE],
    [PlaceType.MUSTAKIL, PlaceType.VILLA],
    [PlaceType.VILLA, PlaceType.MUSTAKIL],
    [PlaceType.DAIRE, PlaceType.MUSTAKIL],
  ],
  [ShipmentCategory.OFFICE_MOVE]: [
    [PlaceType.OFIS, PlaceType.OFIS],
    [PlaceType.OFIS, PlaceType.DEPO],
    [PlaceType.DEPO, PlaceType.OFIS],
  ],
  [ShipmentCategory.PARTIAL_ITEM]: [
    [PlaceType.DAIRE, PlaceType.DAIRE],
    [PlaceType.DAIRE, PlaceType.DIGER],
    [PlaceType.MUSTAKIL, PlaceType.DAIRE],
    [PlaceType.OFIS, PlaceType.DAIRE],
  ],
  [ShipmentCategory.STORAGE]: [
    [PlaceType.DEPO, PlaceType.DEPO],
    [PlaceType.DEPO, PlaceType.DAIRE],
    [PlaceType.DAIRE, PlaceType.DEPO],
  ],
};

const RESERVED_ACTIVE_ROUTES_BY_CUSTOMER_EMAIL = new Map<string, Set<string>>([
  ['ahmet.yilmaz0@gmail.com', new Set(['İstanbul|İstanbul'])],
  ['merve.aydin9@gmail.com', new Set(['İstanbul|Ankara'])],
]);

const DUPLICATE_SENSITIVE_STATUSES = new Set<ShipmentStatus>([
  ShipmentStatus.PENDING,
  ShipmentStatus.MATCHED,
]);

const NOTE_TEMPLATES = [
  'Bina yönetimi için giriş saati önceden bildirilmeli.',
  'Asansör kullanımı için apartman görevlisi ile görüşüldü.',
  'Kırılacak eşyalar ayrı kolilendi, dikkatli taşıma rica edilir.',
  'Teslimat tarafında ofis güvenliği nedeniyle kimlik bildirimi gerekli.',
  'Depo alanına giriş için yarım saat önce aranması yeterli.',
];

export async function seedShipments(
  customers: Customer[],
  carriers: Carrier[],
  vehicleTypeMap: Map<string, string>,
  extraServiceMap: Map<string, string>,
): Promise<Shipment[]> {
  const shipmentRepo = AppDataSource.getRepository(Shipment);
  const vehicleTypeRepo = AppDataSource.getRepository(VehicleType);
  const extraServiceRepo = AppDataSource.getRepository(ExtraService);
  const created: Shipment[] = [];

  const activeVehicleTypes = (await vehicleTypeRepo.findBy({
    id: In(Array.from(vehicleTypeMap.values())),
  })).filter((vehicleType) => vehicleType.status === 'ACTIVE');
  const extraServiceEntities = await extraServiceRepo.findBy({
    id: In(Array.from(extraServiceMap.values())),
  });

  if (activeVehicleTypes.length === 0) {
    throw new Error('Shipment seeding durduruldu: aktif araç tipi bulunamadı.');
  }

  const statusPlan = shuffle(
    STATUS_COUNTS.flatMap(({ status, count }) =>
      Array.from({ length: count }, () => status),
    ),
  );
  const categoryPlan = shuffle(
    CATEGORY_COUNTS.flatMap(({ category, count }) =>
      Array.from({ length: count }, () => category),
    ),
  );

  const verifiedCarriers = carriers.filter((carrier) => carrier.verifiedByAdmin && carrier.isActive);
  const activeCustomers = customers.filter((customer) => customer.isActive);
  const passiveCustomers = customers.filter((customer) => !customer.isActive);
  const powerUserCount = Math.max(1, Math.round(customers.length * 0.2));
  const powerUsers = activeCustomers.slice(0, powerUserCount);
  const customerSelectionPool = [
    ...powerUsers.flatMap((customer) => Array.from({ length: 6 }, () => customer)),
    ...activeCustomers,
    ...passiveCustomers,
  ];
  const activeRouteKeysByCustomer = new Map<string, Set<string>>();

  if (verifiedCarriers.length < 10) {
    throw new Error('Shipment seeding durduruldu: doğrulanmış carrier havuzu yetersiz.');
  }

  for (let index = 0; index < statusPlan.length; index += 1) {
    const status = statusPlan[index];
    const category = categoryPlan[index];
    const customer = randomFrom(customerSelectionPool);
    const assignedCarrier = isAssignedStatus(status) ? randomFrom(verifiedCarriers) : null;
    const distanceBand = randomDistanceBand();
    const reservedRoutes = RESERVED_ACTIVE_ROUTES_BY_CUSTOMER_EMAIL.get(customer.email) ?? new Set<string>();
    const existingActiveRoutes = activeRouteKeysByCustomer.get(customer.id) ?? new Set<string>();

    let originCity = randomWeightedCity();
    let destinationCity = randomDestinationCity(originCity, distanceBand);
    let routeKey = `${originCity}|${destinationCity}`;
    let attempts = 0;

    while (
      attempts < 60 &&
      DUPLICATE_SENSITIVE_STATUSES.has(status) &&
      (reservedRoutes.has(routeKey) || existingActiveRoutes.has(routeKey))
    ) {
      originCity = randomWeightedCity();
      destinationCity = randomDestinationCity(originCity, distanceBand);
      routeKey = `${originCity}|${destinationCity}`;
      attempts += 1;
    }

    if (DUPLICATE_SENSITIVE_STATUSES.has(status)) {
      existingActiveRoutes.add(routeKey);
      activeRouteKeysByCustomer.set(customer.id, existingActiveRoutes);
    }

    const [originPlaceType, destinationPlaceType] = randomFrom(PLACE_TYPE_GROUPS[category]);
    const originFloor = randomFloor(originPlaceType);
    const destinationFloor = randomFloor(destinationPlaceType);
    const shouldHaveExtras = chance(0.4);
    const extraServices = shouldHaveExtras
      ? pickRandom(extraServiceEntities, randomInt(1, Math.min(3, extraServiceEntities.length)))
      : [];
    const weight = randomWeight(category);
    const estimatedWeight = chance(0.8) ? Math.round(weight * randomFloat(0.9, 1.15)) : null;
    const insuranceType = weightedInsuranceType();
    const price = isAssignedStatus(status)
      ? applyOfferVariance(calculateShipmentBasePrice({
        category,
        distanceBand,
        extraServiceCount: extraServices.length,
        floorFactor: originFloor + destinationFloor,
        weightKg: weight,
      }))
      : null;
    const createdAt = randomWeightedDate(CREATED_AT_WINDOWS);
    const shipmentDate = buildShipmentDate(status, createdAt);

    const shipment = shipmentRepo.create({
      id: randomUUID(),
      customerId: customer.id,
      carrierId: assignedCarrier?.id ?? null,
      status,
      shipmentCategory: category,
      price,
      originCity,
      originDistrict: randomDistrict(originCity),
      originPlaceType,
      originFloor,
      originHasElevator: hasElevator(originPlaceType, originFloor),
      destinationCity,
      destinationDistrict: randomDistrict(destinationCity),
      destinationPlaceType,
      destinationFloor,
      destinationHasElevator: hasElevator(destinationPlaceType, destinationFloor),
      loadDetails: randomFrom(LOAD_TYPES),
      insuranceType,
      timePreference: randomFrom(['Sabah', 'Öğlen', 'Akşam']),
      weight,
      estimatedWeight,
      shipmentDate,
      photoUrls: [],
      note: status === ShipmentStatus.CANCELLED
        ? 'Müşteri plan değişikliği nedeniyle taşıma iptal edildi.'
        : randomFrom(NOTE_TEMPLATES),
      vehicleTypePreferenceId: randomFrom(activeVehicleTypes).id,
      contactPhone: customer.phone ?? generatePhone(),
      cancellationReason: status === ShipmentStatus.CANCELLED
        ? randomFrom([
          'Tarih değişikliği',
          'Bütçe revizyonu',
          'Taşınma ertelendi',
          'Alternatif çözüm bulundu',
        ])
        : null,
    });

    const savedShipment = await shipmentRepo.save(shipment, { reload: false });
    await shipmentRepo.createQueryBuilder()
      .update(Shipment)
      .set({ createdAt, updatedAt: createdAt })
      .where('id = :id', { id: savedShipment.id })
      .execute();

    if (extraServices.length > 0) {
      await AppDataSource.createQueryBuilder()
        .relation(Shipment, 'extraServices')
        .of(savedShipment.id)
        .add(extraServices.map((extraService) => extraService.id));
    }

    savedShipment.createdAt = createdAt;
    savedShipment.updatedAt = createdAt;
    created.push(savedShipment);
  }

  console.log(`  ✓ ${created.length} taşıma talebi oluşturuldu`);
  return created;
}

function shuffle<T>(items: T[]): T[] {
  const cloned = [...items];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }

  return cloned;
}

function isAssignedStatus(status: ShipmentStatus): boolean {
  return [
    ShipmentStatus.MATCHED,
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.COMPLETED,
  ].includes(status);
}

function weightedInsuranceType(): InsuranceType {
  const total = INSURANCE_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;

  for (const item of INSURANCE_WEIGHTS) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.type;
    }
  }

  return InsuranceType.NONE;
}

function randomFloor(placeType: PlaceType): number {
  if ([PlaceType.VILLA, PlaceType.MUSTAKIL].includes(placeType)) {
    return randomInt(0, 2);
  }

  if ([PlaceType.OFIS, PlaceType.PLAZA_OFIS].includes(placeType)) {
    return randomInt(1, 12);
  }

  if (placeType === PlaceType.DEPO) {
    return randomInt(0, 1);
  }

  return randomInt(0, 15);
}

function hasElevator(placeType: PlaceType, floor: number): boolean {
  if ([PlaceType.MUSTAKIL, PlaceType.VILLA].includes(placeType)) {
    return chance(0.15);
  }

  if ([PlaceType.OFIS, PlaceType.PLAZA_OFIS].includes(placeType)) {
    return floor > 2 ? chance(0.85) : chance(0.6);
  }

  if (placeType === PlaceType.DEPO) {
    return chance(0.25);
  }

  if (floor <= 1) {
    return chance(0.2);
  }

  if (floor <= 4) {
    return chance(0.45);
  }

  return chance(0.75);
}

function randomWeight(category: ShipmentCategory): number {
  if (category === ShipmentCategory.HOME_MOVE) {
    return randomInt(900, 4500);
  }

  if (category === ShipmentCategory.OFFICE_MOVE) {
    return randomInt(1500, 6500);
  }

  if (category === ShipmentCategory.STORAGE) {
    return randomInt(700, 3000);
  }

  return randomInt(120, 1800);
}

function buildShipmentDate(status: ShipmentStatus, createdAt: Date): Date {
  if (status === ShipmentStatus.COMPLETED) {
    return shiftDays(createdAt, randomInt(2, 18));
  }

  if (status === ShipmentStatus.IN_TRANSIT) {
    return randomPastDateBetween(0, 3, new Date());
  }

  if (status === ShipmentStatus.CANCELLED) {
    return chance(0.55)
      ? shiftDays(createdAt, randomInt(2, 25))
      : randomPastDateBetween(1, 40, new Date());
  }

  if (status === ShipmentStatus.MATCHED) {
    return randomFutureDateBetween(1, 20, new Date());
  }

  return randomFutureDateBetween(2, 35, new Date());
}

function applyOfferVariance(basePrice: number): number {
  return Math.round((basePrice * randomFloat(0.9, 1.2)) / 10) * 10;
}

function shiftDays(date: Date, dayOffset: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + dayOffset);
  return shifted > new Date() ? new Date() : shifted;
}
