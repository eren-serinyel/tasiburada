import { randomUUID } from 'crypto';
import { In } from 'typeorm';
import { SeedDataSource as AppDataSource } from '../seedDataSource';
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
import { ExtraServiceLoadType } from '../../../domain/entities/ExtraServiceApplicability';
import { LOAD_TYPES } from '../data/constants';
import { inferExtraServiceLoadTypeFromShipmentCategory } from '../../../application/services/extra-services/extraServiceApplicability';
import { deriveShipmentV2IdentityFromV1 } from '../../../domain/shipments/ShipmentV2Codes';
import {
  DATE_FLEXIBILITY_CODES,
  deriveDateWindow,
  type ElevatorTypeCode,
  type LocationSideCode,
  type VehicleAccessDistanceCode,
} from '../../../domain/shipments/ShipmentOperationalCodes';
import {
  ARCHIVE_DENSITY_CODES,
  ARCHIVE_UNIT_COUNT_BAND_CODES,
  BOX_COUNT_BAND_CODES,
  HOME_SPECIAL_ITEM_TYPE_CODES,
  HOUSEHOLD_DENSITY_CODES,
  OFFICE_SIZE_BAND_CODES,
  PARTIAL_ITEM_TYPE_CODES,
  PARTIAL_SIZE_CLASS_CODES,
  ROOM_LAYOUT_CODES,
  WORKSTATION_COUNT_BAND_CODES,
  type HomeSpecialItemTypeCode,
  type PartialItemTypeCode,
  type PartialSizeClassCode,
  type ResidenceTypeCode,
} from '../../../domain/shipments/ShipmentCategoryDetailCodes';
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

const EXTRA_SERVICE_ATTACH_PROBABILITY: Record<ExtraServiceLoadType, number> = {
  [ExtraServiceLoadType.HOME]: 0.68,
  [ExtraServiceLoadType.OFFICE]: 0.74,
  [ExtraServiceLoadType.PARTIAL]: 0.36,
  [ExtraServiceLoadType.STORAGE]: 0.27,
};

const EXTRA_SERVICE_COUNT_WEIGHTS: Record<ExtraServiceLoadType, Array<{ count: number; weight: number }>> = {
  [ExtraServiceLoadType.HOME]: [
    { count: 1, weight: 45 },
    { count: 2, weight: 35 },
    { count: 3, weight: 20 },
  ],
  [ExtraServiceLoadType.OFFICE]: [
    { count: 1, weight: 30 },
    { count: 2, weight: 40 },
    { count: 3, weight: 30 },
  ],
  [ExtraServiceLoadType.PARTIAL]: [
    { count: 1, weight: 65 },
    { count: 2, weight: 30 },
    { count: 3, weight: 5 },
  ],
  [ExtraServiceLoadType.STORAGE]: [
    { count: 1, weight: 70 },
    { count: 2, weight: 25 },
    { count: 3, weight: 5 },
  ],
};

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
  const extraServiceEntities = await extraServiceRepo.find({
    where: {
      id: In(Array.from(extraServiceMap.values())),
    },
    relations: ['applicabilityRules'],
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
    const loadType = inferExtraServiceLoadTypeFromShipmentCategory(category);
    const applicableExtraServices = extraServiceEntities.filter((extraService) =>
      matchesApplicability(extraService, loadType),
    );
    const extraServices = pickRealisticExtraServices(applicableExtraServices, loadType);
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

  await persistSeedShipmentV2Identity(created);
  await persistSeedShipmentOperationalDetails(created);
  await persistSeedShipmentCategoryDetails(created);
  console.log(`  ✓ ${created.length} taşıma talebi oluşturuldu`);
  return created;
}

async function persistSeedShipmentV2Identity(
  shipments: Shipment[],
): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const [hasServiceCategoryCode, hasRouteScopeCode] =
      await Promise.all([
        queryRunner.hasColumn('shipments', 'service_category_code'),
        queryRunner.hasColumn('shipments', 'route_scope_code'),
      ]);

    if (!hasServiceCategoryCode && !hasRouteScopeCode) {
      return;
    }
    if (!hasServiceCategoryCode || !hasRouteScopeCode) {
      throw new Error(
        'Shipment V2 seed identity columns are partially applied.',
      );
    }

    const batchSize = 200;
    for (let start = 0; start < shipments.length; start += batchSize) {
      const batch = shipments.slice(start, start + batchSize);
      const serviceCases: string[] = [];
      const routeCases: string[] = [];
      const serviceParameters: unknown[] = [];
      const routeParameters: unknown[] = [];
      const ids: string[] = [];

      for (const shipment of batch) {
        const identity = deriveShipmentV2IdentityFromV1({
          shipmentCategory: shipment.shipmentCategory,
          originCity: shipment.originCity,
          destinationCity: shipment.destinationCity,
        });
        shipment.serviceCategoryCode =
          identity.serviceCategoryCode;
        shipment.routeScopeCode = identity.routeScopeCode;
        serviceCases.push('WHEN ? THEN ?');
        routeCases.push('WHEN ? THEN ?');
        serviceParameters.push(
          shipment.id,
          identity.serviceCategoryCode,
        );
        routeParameters.push(
          shipment.id,
          identity.routeScopeCode,
        );
        ids.push(shipment.id);
      }

      const idPlaceholders = ids.map(() => '?').join(', ');
      await queryRunner.query(
        `UPDATE \`shipments\`
            SET \`service_category_code\` =
                  CASE \`id\`
                    ${serviceCases.join('\n                    ')}
                    ELSE \`service_category_code\`
                  END,
                \`route_scope_code\` =
                  CASE \`id\`
                    ${routeCases.join('\n                    ')}
                    ELSE \`route_scope_code\`
                  END
          WHERE \`id\` IN (${idPlaceholders})`,
        [
          ...serviceParameters,
          ...routeParameters,
          ...ids,
        ],
      );
    }
  } finally {
    await queryRunner.release();
  }
}

interface SeedLocationCondition {
  readonly id: string;
  readonly shipmentId: string;
  readonly sideCode: LocationSideCode;
  readonly floorNumber: number | null;
  readonly elevatorTypeCode: ElevatorTypeCode | null;
  readonly vehicleAccessDistanceCode:
    VehicleAccessDistanceCode | null;
  readonly hasNarrowStreet: boolean | null;
  readonly hasSiteEntryRestriction: boolean | null;
  readonly hasTimeRestriction: boolean | null;
  readonly restrictionNote: string | null;
}

async function persistSeedShipmentOperationalDetails(
  shipments: Shipment[],
): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const [
      hasDateFlexibilityCode,
      hasDateWindowStart,
      hasDateWindowEnd,
      hasLocationConditions,
    ] = await Promise.all([
      queryRunner.hasColumn(
        'shipments',
        'date_flexibility_code',
      ),
      queryRunner.hasColumn('shipments', 'date_window_start'),
      queryRunner.hasColumn('shipments', 'date_window_end'),
      queryRunner.hasTable('shipment_location_conditions'),
    ]);
    const operationalObjects = [
      hasDateFlexibilityCode,
      hasDateWindowStart,
      hasDateWindowEnd,
      hasLocationConditions,
    ];
    if (operationalObjects.every(value => !value)) return;
    if (operationalObjects.some(value => !value)) {
      throw new Error(
        'Shipment operational seed schema is partially applied.',
      );
    }

    const batchSize = 200;
    for (
      let start = 0;
      start < shipments.length;
      start += batchSize
    ) {
      const batch = shipments.slice(start, start + batchSize);
      const codeCases: string[] = [];
      const startCases: string[] = [];
      const endCases: string[] = [];
      const codeParameters: unknown[] = [];
      const startParameters: unknown[] = [];
      const endParameters: unknown[] = [];
      const ids: string[] = [];
      const conditions: SeedLocationCondition[] = [];

      batch.forEach((shipment, batchIndex) => {
        const absoluteIndex = start + batchIndex;
        const flexibilityCode =
          DATE_FLEXIBILITY_CODES[
            absoluteIndex % DATE_FLEXIBILITY_CODES.length
          ];
        const window = deriveDateWindow(
          shipment.shipmentDate,
          flexibilityCode,
        );
        codeCases.push('WHEN ? THEN ?');
        startCases.push('WHEN ? THEN ?');
        endCases.push('WHEN ? THEN ?');
        codeParameters.push(shipment.id, flexibilityCode);
        startParameters.push(shipment.id, window.start);
        endParameters.push(shipment.id, window.end);
        ids.push(shipment.id);

        conditions.push(
          buildSeedLocationCondition(
            shipment,
            'ORIGIN',
            absoluteIndex,
          ),
          buildSeedLocationCondition(
            shipment,
            'DESTINATION',
            absoluteIndex + 1,
          ),
        );
      });

      const idPlaceholders = ids.map(() => '?').join(', ');
      await queryRunner.query(
        `UPDATE \`shipments\`
            SET \`date_flexibility_code\` =
                  CASE \`id\`
                    ${codeCases.join('\n                    ')}
                    ELSE \`date_flexibility_code\`
                  END,
                \`date_window_start\` =
                  CASE \`id\`
                    ${startCases.join('\n                    ')}
                    ELSE \`date_window_start\`
                  END,
                \`date_window_end\` =
                  CASE \`id\`
                    ${endCases.join('\n                    ')}
                    ELSE \`date_window_end\`
                  END
          WHERE \`id\` IN (${idPlaceholders})`,
        [
          ...codeParameters,
          ...startParameters,
          ...endParameters,
          ...ids,
        ],
      );

      const conditionPlaceholders = conditions
        .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .join(', ');
      await queryRunner.query(
        `INSERT INTO \`shipment_location_conditions\` (
           \`id\`,
           \`shipment_id\`,
           \`side_code\`,
           \`floor_number\`,
           \`elevator_type_code\`,
           \`vehicle_access_distance_code\`,
           \`has_narrow_street\`,
           \`has_site_entry_restriction\`,
           \`has_time_restriction\`,
           \`restriction_note\`
         ) VALUES ${conditionPlaceholders}
         ON DUPLICATE KEY UPDATE
           \`floor_number\` = VALUES(\`floor_number\`),
           \`elevator_type_code\` =
             VALUES(\`elevator_type_code\`),
           \`vehicle_access_distance_code\` =
             VALUES(\`vehicle_access_distance_code\`),
           \`has_narrow_street\` =
             VALUES(\`has_narrow_street\`),
           \`has_site_entry_restriction\` =
             VALUES(\`has_site_entry_restriction\`),
           \`has_time_restriction\` =
             VALUES(\`has_time_restriction\`),
           \`restriction_note\` = VALUES(\`restriction_note\`)`,
        conditions.flatMap(condition => [
          condition.id,
          condition.shipmentId,
          condition.sideCode,
          condition.floorNumber,
          condition.elevatorTypeCode,
          condition.vehicleAccessDistanceCode,
          condition.hasNarrowStreet,
          condition.hasSiteEntryRestriction,
          condition.hasTimeRestriction,
          condition.restrictionNote,
        ]),
      );
    }
  } finally {
    await queryRunner.release();
  }
}

const CATEGORY_DETAIL_TABLES = [
  'shipment_home_move_details',
  'shipment_home_move_items',
  'shipment_office_move_details',
  'shipment_partial_item_details',
  'shipment_partial_items',
] as const;

const seedResidenceType = (
  placeType: PlaceType | null,
): ResidenceTypeCode | null => {
  switch (placeType) {
    case PlaceType.DAIRE:
    case PlaceType.APARTMAN_DAIRESI:
    case PlaceType.SITE_ICI_DAIRE:
      return 'APARTMENT';
    case PlaceType.MUSTAKIL:
      return 'DETACHED_HOUSE';
    case PlaceType.VILLA:
      return 'VILLA';
    default:
      return null;
  }
};

const insertSeedRows = async (
  queryRunner: ReturnType<
    typeof AppDataSource.createQueryRunner
  >,
  tableName: string,
  columns: readonly string[],
  rows: readonly (readonly unknown[])[],
): Promise<void> => {
  const batchSize = 200;
  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    if (batch.length === 0) continue;
    const placeholders = batch
      .map(() => `(${columns.map(() => '?').join(', ')})`)
      .join(', ');
    await queryRunner.query(
      `INSERT INTO \`${tableName}\` (
         ${columns.map(column => `\`${column}\``).join(', ')}
       ) VALUES ${placeholders}`,
      batch.flatMap(row => [...row]),
    );
  }
};

async function persistSeedShipmentCategoryDetails(
  shipments: Shipment[],
): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const tablePresence = await Promise.all(
      CATEGORY_DETAIL_TABLES.map(table =>
        queryRunner.hasTable(table),
      ),
    );
    if (tablePresence.every(value => !value)) return;
    if (tablePresence.some(value => !value)) {
      throw new Error(
        'Shipment category detail seed schema is partially applied.',
      );
    }

    const homeDetails: unknown[][] = [];
    const homeItems: unknown[][] = [];
    const officeDetails: unknown[][] = [];
    const partialDetails: unknown[][] = [];
    const partialItems: unknown[][] = [];

    shipments.forEach((shipment, index) => {
      switch (shipment.serviceCategoryCode) {
        case 'HOME_MOVE': {
          homeDetails.push([
            shipment.id,
            'HOME_MOVE',
            seedResidenceType(shipment.originPlaceType),
            ROOM_LAYOUT_CODES[index % 6],
            HOUSEHOLD_DENSITY_CODES[index % 4],
            BOX_COUNT_BAND_CODES[index % 5],
          ]);
          if (index % 4 === 0) {
            const itemType =
              HOME_SPECIAL_ITEM_TYPE_CODES[
                index %
                  HOME_SPECIAL_ITEM_TYPE_CODES.length
              ] as HomeSpecialItemTypeCode;
            homeItems.push([
              randomUUID(),
              shipment.id,
              itemType,
              (index % 3) + 1,
              itemType === 'OTHER'
                ? 'Özel sanat eseri'
                : null,
            ]);
          }
          break;
        }
        case 'OFFICE_MOVE': {
          const hasFixedDeadline =
            [null, false, true][index % 3] as
              boolean | null;
          officeDetails.push([
            shipment.id,
            'OFFICE_MOVE',
            OFFICE_SIZE_BAND_CODES[index % 5],
            WORKSTATION_COUNT_BAND_CODES[index % 5],
            ARCHIVE_UNIT_COUNT_BAND_CODES[index % 5],
            ARCHIVE_DENSITY_CODES[index % 5],
            seedTriStateBoolean(index),
            seedTriStateBoolean(index + 1),
            seedTriStateBoolean(index + 2),
            seedTriStateBoolean(index + 3),
            hasFixedDeadline,
            hasFixedDeadline === true
              ? shipment.shipmentDate
              : null,
            seedTriStateBoolean(index + 4),
          ]);
          break;
        }
        case 'PARTIAL_ITEM': {
          partialDetails.push([
            shipment.id,
            'PARTIAL_ITEM',
          ]);
          const itemCount = (index % 2) + 1;
          for (
            let itemIndex = 0;
            itemIndex < itemCount;
            itemIndex += 1
          ) {
            const catalogIndex = index + itemIndex;
            const itemType =
              PARTIAL_ITEM_TYPE_CODES[
                catalogIndex %
                  PARTIAL_ITEM_TYPE_CODES.length
              ] as PartialItemTypeCode;
            const sizeClass =
              PARTIAL_SIZE_CLASS_CODES[
                catalogIndex %
                  PARTIAL_SIZE_CLASS_CODES.length
              ] as PartialSizeClassCode;
            const hasMeasurements =
              sizeClass === 'MEASUREMENTS_PROVIDED';
            partialItems.push([
              randomUUID(),
              shipment.id,
              itemType,
              itemType === 'OTHER'
                ? 'Özel dekoratif eşya'
                : null,
              (catalogIndex % 4) + 1,
              sizeClass,
              seedTriStateBoolean(catalogIndex),
              seedTriStateBoolean(catalogIndex + 1),
              seedTriStateBoolean(catalogIndex + 2),
              seedTriStateBoolean(catalogIndex + 3),
              hasMeasurements
                ? 40 + (catalogIndex % 120)
                : null,
              hasMeasurements
                ? 60 + (catalogIndex % 160)
                : null,
              hasMeasurements
                ? 30 + (catalogIndex % 100)
                : null,
              5 + (catalogIndex % 500),
            ]);
          }
          break;
        }
        default:
          break;
      }
    });

    await insertSeedRows(
      queryRunner,
      'shipment_home_move_details',
      [
        'shipment_id',
        'service_category_code',
        'residence_type_code',
        'room_layout_code',
        'household_density_code',
        'box_count_band_code',
      ],
      homeDetails,
    );
    await insertSeedRows(
      queryRunner,
      'shipment_office_move_details',
      [
        'shipment_id',
        'service_category_code',
        'office_size_band_code',
        'workstation_count_band_code',
        'archive_unit_count_band_code',
        'archive_density_code',
        'has_server_room',
        'has_sensitive_electronics',
        'has_heavy_equipment',
        'requires_after_hours_move',
        'has_fixed_completion_deadline',
        'completion_deadline_at',
        'must_remain_operational',
      ],
      officeDetails,
    );
    await insertSeedRows(
      queryRunner,
      'shipment_partial_item_details',
      ['shipment_id', 'service_category_code'],
      partialDetails,
    );
    await insertSeedRows(
      queryRunner,
      'shipment_home_move_items',
      [
        'id',
        'shipment_id',
        'item_type_code',
        'quantity',
        'custom_label',
      ],
      homeItems,
    );
    await insertSeedRows(
      queryRunner,
      'shipment_partial_items',
      [
        'id',
        'shipment_id',
        'item_type_code',
        'custom_label',
        'quantity',
        'size_class_code',
        'is_fragile',
        'requires_disassembly',
        'requires_installation',
        'requires_packaging',
        'width_cm',
        'length_cm',
        'height_cm',
        'approximate_weight_kg',
      ],
      partialItems,
    );
  } finally {
    await queryRunner.release();
  }
}

const buildSeedLocationCondition = (
  shipment: Shipment,
  sideCode: LocationSideCode,
  index: number,
): SeedLocationCondition => {
  const isOrigin = sideCode === 'ORIGIN';
  const floorNumber = isOrigin
    ? shipment.originFloor
    : shipment.destinationFloor;
  const hasBuildingElevator = isOrigin
    ? shipment.originHasElevator
    : shipment.destinationHasElevator;
  const elevatorTypeCode =
    seedElevatorTypeCode(
      floorNumber,
      hasBuildingElevator,
      index,
    );
  const vehicleAccessDistanceCode =
    seedVehicleAccessDistanceCode(index);
  const hasNarrowStreet =
    seedTriStateBoolean(index);
  const hasSiteEntryRestriction =
    seedTriStateBoolean(index + 1);
  const hasTimeRestriction =
    seedTriStateBoolean(index + 2);
  const restrictionNote =
    hasSiteEntryRestriction === true ||
    hasTimeRestriction === true
      ? 'Operasyon saati önceden teyit edilmeli.'
      : null;

  return {
    id: randomUUID(),
    shipmentId: shipment.id,
    sideCode,
    floorNumber,
    elevatorTypeCode,
    vehicleAccessDistanceCode,
    hasNarrowStreet,
    hasSiteEntryRestriction,
    hasTimeRestriction,
    restrictionNote,
  };
};

const seedElevatorTypeCode = (
  floorNumber: number | null,
  hasBuildingElevator: boolean | null,
  index: number,
): ElevatorTypeCode | null => {
  if (hasBuildingElevator === null) return 'UNKNOWN';
  if (!hasBuildingElevator) return 'NONE';
  if (index % 11 === 0) return 'NOT_SUITABLE';
  if ((floorNumber ?? 0) >= 6 && index % 4 === 0) {
    return 'FREIGHT';
  }
  return 'STANDARD';
};

const seedVehicleAccessDistanceCode = (
  index: number,
): VehicleAccessDistanceCode =>
  [
    'AT_ENTRANCE',
    'BETWEEN_20_AND_50_METERS',
    'OVER_50_METERS',
    'UNKNOWN',
  ][index % 4] as VehicleAccessDistanceCode;

const seedTriStateBoolean = (
  index: number,
): boolean | null =>
  [null, false, true][index % 3] as boolean | null;

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

function matchesApplicability(extraService: ExtraService & { applicabilityRules?: Array<{ loadType: ExtraServiceLoadType }> }, loadType: ExtraServiceLoadType | null): boolean {
  if (!loadType) return true;
  if (!Array.isArray(extraService.applicabilityRules) || extraService.applicabilityRules.length === 0) {
    return true;
  }
  return extraService.applicabilityRules.some((rule) => rule.loadType === loadType);
}

function pickRealisticExtraServices(
  applicableServices: Array<ExtraService & { applicabilityRules?: Array<{ loadType: ExtraServiceLoadType; isRecommendedByConverter?: boolean; isDefaultVisible?: boolean }> }>,
  loadType: ExtraServiceLoadType | null,
): ExtraService[] {
  if (!loadType || applicableServices.length === 0) {
    return [];
  }

  const shouldAttach = chance(EXTRA_SERVICE_ATTACH_PROBABILITY[loadType]);
  if (!shouldAttach) {
    return [];
  }

  const targetCount = weightedCount(EXTRA_SERVICE_COUNT_WEIGHTS[loadType]);
  const weightedPool = applicableServices.flatMap((service) => {
    const rule = (service.applicabilityRules ?? []).find((entry) => entry.loadType === loadType);
    const multiplier = rule?.isRecommendedByConverter
      ? 3
      : rule?.isDefaultVisible
        ? 2
        : 1;
    return Array.from({ length: multiplier }, () => service);
  });

  const selectedById = new Map<string, ExtraService>();
  const attempts = Math.max(8, targetCount * 6);

  for (let index = 0; index < attempts && selectedById.size < targetCount; index += 1) {
    const picked = randomFrom(weightedPool);
    selectedById.set(picked.id, picked);
  }

  if (selectedById.size === 0) {
    selectedById.set(applicableServices[0].id, applicableServices[0]);
  }

  return Array.from(selectedById.values()).slice(0, Math.min(targetCount, applicableServices.length));
}

function weightedCount(options: Array<{ count: number; weight: number }>): number {
  const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const option of options) {
    cursor -= option.weight;
    if (cursor <= 0) {
      return option.count;
    }
  }

  return options[0].count;
}
