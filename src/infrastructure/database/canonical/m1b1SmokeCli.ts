import { createHash } from 'crypto';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { CanonicalBaselineV11784500000000 } from '../canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';
import { AddShipmentOperationalConditions1784660000000 } from '../canonical-migrations/1784660000000-AddShipmentOperationalConditions';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
  inspectDisposableDatabase,
} from '../disposable/disposableMysqlHarness';
import { assertSafeDisposableDatabaseTarget } from '../disposable/disposableDatabaseSafety';
import {
  inspectCanonicalSchema,
  readOnlySchemaConnectionOptionsFromEnvironment,
} from '../disposable/schemaIntrospection';
import { countCanonicalSchema } from './canonicalVerification';
import { canonicalDataSourceOptions } from './canonicalDataSource';
import {
  cleanupDisposableFixtureDirectory,
  createDisposableFixtureDirectory,
  type DisposableFixtureDirectory,
} from './disposableFixtureSafety';

config();

type SmokeMode = 'from-zero' | 'seeded-upgrade';

const MIGRATION_NAMES = [
  'CanonicalBaselineV11784500000000',
  'AddShipmentV2IdentityCodes1784580000000',
  'AddShipmentOperationalConditions1784660000000',
] as const;
const M1A_MIGRATIONS = [
  CanonicalBaselineV11784500000000,
  AddShipmentV2IdentityCodes1784580000000,
] as const;
const M1B1_MIGRATIONS = [
  ...M1A_MIGRATIONS,
  AddShipmentOperationalConditions1784660000000,
] as const;

const fail = (reason: string): never => {
  throw new Error(`M1B-1 smoke failed: ${reason}`);
};

const requireTarget = (): string => {
  const target = process.env.DB_NAME;
  if (!target) fail('DB_NAME must be explicit');
  const verifiedTarget = target as string;
  if (
    process.env.DISPOSABLE_DB_NAME !== verifiedTarget ||
    process.env.CANONICAL_DB_NAME !== verifiedTarget
  ) {
    fail(
      'DB_NAME, DISPOSABLE_DB_NAME and CANONICAL_DB_NAME must match',
    );
  }
  assertSafeDisposableDatabaseTarget(
    process.env,
    verifiedTarget,
    'CONNECT',
  );
  return verifiedTarget;
};

const initializeDataSource = async (
  migrations: readonly (new () => unknown)[],
): Promise<DataSource> => {
  const dataSource = new DataSource({
    ...canonicalDataSourceOptions(process.env, {
      loadEntities: true,
    }),
    migrations: [...migrations] as never[],
  });
  await dataSource.initialize();
  await dataSource.query(`SET SESSION time_zone = '+00:00'`);
  return dataSource;
};

const countRows = async (
  dataSource: DataSource,
  tableName: string,
): Promise<number> => {
  const rows = (await dataSource.query(
    `SELECT COUNT(*) AS rowCount FROM \`${tableName}\``,
  )) as Array<{ readonly rowCount: number | string }>;
  return Number(rows[0]?.rowCount);
};

const shipmentIdFingerprint = async (
  dataSource: DataSource,
): Promise<string> => {
  const rows = (await dataSource.query(
    'SELECT id FROM `shipments` ORDER BY id',
  )) as Array<{ readonly id: string }>;
  return createHash('sha256')
    .update(rows.map(row => row.id).join('\n'))
    .digest('hex');
};

const assertNoRows = async (
  dataSource: DataSource,
  statement: string,
  reason: string,
): Promise<void> => {
  const rows = (await dataSource.query(statement)) as unknown[];
  if (rows.length > 0) fail(reason);
};

const assertFinalMigrationState = async (
  dataSource: DataSource,
): Promise<void> => {
  const rows = (await dataSource.query(
    'SELECT name FROM `migrations` ORDER BY timestamp, id, name',
  )) as Array<{ readonly name: string }>;
  const names = rows.map(row => String(row.name));
  if (
    JSON.stringify(names) !== JSON.stringify(MIGRATION_NAMES) ||
    await dataSource.showMigrations()
  ) {
    fail('canonical migration history mismatch');
  }
  const timezoneRows = (await dataSource.query(
    'SELECT @@session.time_zone AS sessionTimezone',
  )) as Array<{ readonly sessionTimezone: string }>;
  if (String(timezoneRows[0]?.sessionTimezone) !== '+00:00') {
    fail('session timezone mismatch');
  }
};

interface PhysicalResult {
  readonly fingerprint: string;
  readonly counts: ReturnType<typeof countCanonicalSchema>;
}

const assertPhysicalSchema = async (
  dataSource: DataSource,
): Promise<PhysicalResult> => {
  const dateColumns = (await dataSource.query(
    `SELECT COLUMN_NAME AS name,
            COLUMN_TYPE AS physicalType,
            IS_NULLABLE AS nullable,
            COLUMN_DEFAULT AS defaultValue,
            CHARACTER_SET_NAME AS characterSet,
            COLLATION_NAME AS collation
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'shipments'
        AND COLUMN_NAME IN (
          'date_flexibility_code',
          'date_window_start',
          'date_window_end'
        )
      ORDER BY ORDINAL_POSITION`,
  )) as Array<{
    readonly name: string;
    readonly physicalType: string;
    readonly nullable: string;
    readonly defaultValue: string | null;
    readonly characterSet: string | null;
    readonly collation: string | null;
  }>;
  if (
    dateColumns.length !== 3 ||
    dateColumns.some(
      column =>
        column.nullable !== 'YES' ||
        column.defaultValue !== null,
    ) ||
    dateColumns[0].physicalType.toLowerCase() !== 'varchar(32)' ||
    dateColumns[0].characterSet !== 'ascii' ||
    dateColumns[0].collation !== 'ascii_bin' ||
    dateColumns.slice(1).some(
      column => column.physicalType.toLowerCase() !== 'date',
    )
  ) {
    fail('canonical date column metadata mismatch');
  }

  const locationColumns = (await dataSource.query(
    `SELECT COLUMN_NAME AS name
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'shipment_location_conditions'
      ORDER BY ORDINAL_POSITION`,
  )) as Array<{ readonly name: string }>;
  if (locationColumns.length !== 12) {
    fail('location condition column count mismatch');
  }

  const foreignKeys = (await dataSource.query(
    `SELECT rc.CONSTRAINT_NAME AS constraintName,
            rc.DELETE_RULE AS deleteRule,
            rc.UPDATE_RULE AS updateRule,
            kcu.REFERENCED_TABLE_NAME AS referencedTable,
            kcu.REFERENCED_COLUMN_NAME AS referencedColumn
       FROM information_schema.REFERENTIAL_CONSTRAINTS rc
       JOIN information_schema.KEY_COLUMN_USAGE kcu
         ON kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
        AND kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
        AND rc.TABLE_NAME = 'shipment_location_conditions'`,
  )) as Array<{
    readonly constraintName: string;
    readonly deleteRule: string;
    readonly updateRule: string;
    readonly referencedTable: string;
    readonly referencedColumn: string;
  }>;
  if (
    foreignKeys.length !== 1 ||
    foreignKeys[0].constraintName !==
      'FK_shipment_location_conditions_shipment' ||
    foreignKeys[0].deleteRule !== 'CASCADE' ||
    foreignKeys[0].updateRule !== 'RESTRICT' ||
    foreignKeys[0].referencedTable !== 'shipments' ||
    foreignKeys[0].referencedColumn !== 'id'
  ) {
    fail('location condition foreign key mismatch');
  }

  const indexRows = (await dataSource.query(
    `SELECT INDEX_NAME AS indexName,
            NON_UNIQUE AS nonUnique,
            SEQ_IN_INDEX AS position,
            COLUMN_NAME AS columnName
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'shipment_location_conditions'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
  )) as Array<{
    readonly indexName: string;
    readonly nonUnique: number | string;
    readonly position: number | string;
    readonly columnName: string;
  }>;
  const expectedIndexes = [
    [
      'IDX_shipment_location_conditions_shipment_id',
      1,
      1,
      'shipment_id',
    ],
    ['PRIMARY', 0, 1, 'id'],
    [
      'UQ_shipment_location_conditions_shipment_side',
      0,
      1,
      'shipment_id',
    ],
    [
      'UQ_shipment_location_conditions_shipment_side',
      0,
      2,
      'side_code',
    ],
  ];
  const actualIndexes = indexRows.map(row => [
    row.indexName,
    Number(row.nonUnique),
    Number(row.position),
    row.columnName,
  ]);
  if (
    JSON.stringify(actualIndexes) !==
    JSON.stringify(expectedIndexes)
  ) {
    fail('location condition index metadata mismatch');
  }

  const checkRows = (await dataSource.query(
    `SELECT tc.CONSTRAINT_NAME AS constraintName
       FROM information_schema.TABLE_CONSTRAINTS tc
      WHERE tc.TABLE_SCHEMA = DATABASE()
        AND tc.TABLE_NAME IN (
          'shipments',
          'shipment_location_conditions'
        )
        AND tc.CONSTRAINT_TYPE = 'CHECK'
        AND (
          tc.CONSTRAINT_NAME LIKE 'CHK_shipments_date_%'
          OR tc.CONSTRAINT_NAME LIKE
            'CHK_shipment_location_conditions_%'
        )`,
  )) as Array<{ readonly constraintName: string }>;
  if (checkRows.length !== 11) {
    fail('M1B-1 CHECK constraint count mismatch');
  }

  const manifest = await inspectCanonicalSchema(
    readOnlySchemaConnectionOptionsFromEnvironment(process.env),
  );
  const counts = countCanonicalSchema(manifest);
  if (counts.tables !== 48) {
    fail('M1B-1 table count mismatch');
  }
  return {
    fingerprint: manifest.schemaFingerprint,
    counts,
  };
};

const runFromZero = async (): Promise<void> => {
  const dataSource = await initializeDataSource(
    M1B1_MIGRATIONS,
  );
  try {
    const applied = await dataSource.runMigrations({
      transaction: 'none',
    });
    if (
      JSON.stringify(applied.map(item => item.name)) !==
      JSON.stringify(MIGRATION_NAMES)
    ) {
      fail('from-zero migration order mismatch');
    }
    await assertFinalMigrationState(dataSource);
    const physical = await assertPhysicalSchema(dataSource);
    if (
      await countRows(dataSource, 'shipments') !== 0 ||
      await countRows(
        dataSource,
        'shipment_location_conditions',
      ) !== 0
    ) {
      fail('from-zero application tables are not empty');
    }
    console.log('M1B-1 mode: from-zero');
    console.log(`Canonical migrations: ${applied.length}`);
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log(`M1B-1 fingerprint: ${physical.fingerprint}`);
    console.log(
      `M1B-1 schema counts: ${JSON.stringify(physical.counts)}`,
    );
  } finally {
    await dataSource.destroy();
  }
};

const runSeededUpgrade = async (): Promise<void> => {
  const [{ withSeedDataSource }, { runSeedWorkflow }] =
    await Promise.all([
      import('../../../database/seed/seedDataSource'),
      import('../../../database/seed/seedWorkflow'),
    ]);
  const beforeDataSource = await initializeDataSource(
    M1A_MIGRATIONS,
  );
  const beforeCounts: Record<string, number> = {};
  let beforeShipmentHash = '';
  try {
    const applied = await beforeDataSource.runMigrations({
      transaction: 'none',
    });
    if (applied.length !== 2) {
      fail('seeded-upgrade M1A migration setup mismatch');
    }
    await withSeedDataSource(beforeDataSource, () =>
      runSeedWorkflow({ clearFirst: false, env: process.env }),
    );
    for (const table of [
      'shipments',
      'offers',
      'customers',
      'carriers',
      'carrier_documents',
    ]) {
      beforeCounts[table] = await countRows(
        beforeDataSource,
        table,
      );
    }
    beforeShipmentHash =
      await shipmentIdFingerprint(beforeDataSource);
    if (beforeCounts.shipments !== 2000) {
      fail('seeded-upgrade shipment count mismatch');
    }
    await assertNoRows(
      beforeDataSource,
      `SELECT name
         FROM extra_services
        GROUP BY name
       HAVING COUNT(*) > 1`,
      'seed duplicate extra service invariant',
    );
  } finally {
    await beforeDataSource.destroy();
  }

  const dataSource = await initializeDataSource(
    M1B1_MIGRATIONS,
  );
  try {
    const applied = await dataSource.runMigrations({
      transaction: 'none',
    });
    if (
      applied.length !== 1 ||
      applied[0].name !== MIGRATION_NAMES[2]
    ) {
      fail('seeded-upgrade M1B-1 application mismatch');
    }
    await assertFinalMigrationState(dataSource);
    for (const [table, beforeCount] of Object.entries(
      beforeCounts,
    )) {
      if (await countRows(dataSource, table) !== beforeCount) {
        fail(`${table} row preservation mismatch`);
      }
    }
    if (
      await shipmentIdFingerprint(dataSource) !==
      beforeShipmentHash
    ) {
      fail('shipment primary-key preservation mismatch');
    }

    await assertNoRows(
      dataSource,
      `SELECT shipment.id
         FROM shipments shipment
         LEFT JOIN customers customer
           ON customer.id = shipment.customer_id
        WHERE customer.id IS NULL`,
      'shipment customer orphan',
    );
    await assertNoRows(
      dataSource,
      `SELECT offer.id
         FROM offers offer
         LEFT JOIN shipments shipment
           ON shipment.id = offer.shipmentId
         LEFT JOIN carriers carrier
           ON carrier.id = offer.carrierId
        WHERE shipment.id IS NULL OR carrier.id IS NULL`,
      'offer relationship orphan',
    );
    await assertNoRows(
      dataSource,
      `SELECT conditionRow.id
         FROM shipment_location_conditions conditionRow
         LEFT JOIN shipments shipment
           ON shipment.id = conditionRow.shipment_id
        WHERE shipment.id IS NULL`,
      'location condition shipment orphan',
    );
    await assertNoRows(
      dataSource,
      `SELECT conditionRow.id
         FROM shipment_location_conditions conditionRow
         JOIN shipments shipment
           ON shipment.id = conditionRow.shipment_id
        WHERE (
          conditionRow.side_code = 'ORIGIN'
          AND NOT (
            conditionRow.floor_number <=>
              shipment.origin_floor
          )
        ) OR (
          conditionRow.side_code = 'DESTINATION'
          AND NOT (
            conditionRow.floor_number <=>
              shipment.destination_floor
          )
        )`,
      'location floor backfill mismatch',
    );
    await assertNoRows(
      dataSource,
      `SELECT id
         FROM shipment_location_conditions
        WHERE elevator_type_code IS NOT NULL
           OR vehicle_access_distance_code IS NOT NULL
           OR has_narrow_street IS NOT NULL
           OR has_site_entry_restriction IS NOT NULL
           OR has_time_restriction IS NOT NULL
           OR restriction_note IS NOT NULL`,
      'unproven V1 operational defaults were introduced',
    );
    await assertNoRows(
      dataSource,
      `SELECT id
         FROM shipments
        WHERE date_flexibility_code <> 'EXACT_DATE'
           OR date_window_start <> shipment_date
           OR date_window_end <> shipment_date`,
      'legacy exact date backfill mismatch',
    );

    const sideDistribution = await dataSource.query(
      `SELECT side_code AS code, COUNT(*) AS rowCount
         FROM shipment_location_conditions
        GROUP BY side_code
        ORDER BY side_code`,
    );
    const floorDistribution = await dataSource.query(
      `SELECT side_code AS code,
              MIN(floor_number) AS minimumFloor,
              MAX(floor_number) AS maximumFloor,
              SUM(floor_number IS NULL) AS nullRows
         FROM shipment_location_conditions
        GROUP BY side_code
        ORDER BY side_code`,
    );
    const dateDistribution = await dataSource.query(
      `SELECT date_flexibility_code AS code,
              COUNT(*) AS rowCount
         FROM shipments
        GROUP BY date_flexibility_code
        ORDER BY date_flexibility_code`,
    );
    const physical = await assertPhysicalSchema(dataSource);
    console.log('M1B-1 mode: seeded-upgrade');
    console.log(
      `Shipment rows before/after: ${beforeCounts.shipments}/${await countRows(dataSource, 'shipments')}`,
    );
    console.log(
      `Shipment PK fingerprint preserved: true`,
    );
    console.log(
      `Location side distribution: ${JSON.stringify(sideDistribution)}`,
    );
    console.log(
      `Location floor distribution: ${JSON.stringify(floorDistribution)}`,
    );
    console.log(
      `Date flexibility distribution: ${JSON.stringify(dateDistribution)}`,
    );
    console.log('Elevator/access/restriction backfill: NULL');
    console.log('Seed invariants: PASS');
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log(`M1B-1 fingerprint: ${physical.fingerprint}`);
  } finally {
    await dataSource.destroy();
  }
};

const main = async (): Promise<void> => {
  const mode = process.argv[2] as SmokeMode | undefined;
  if (mode !== 'from-zero' && mode !== 'seeded-upgrade') {
    fail('mode must be from-zero or seeded-upgrade');
  }
  const target = requireTarget();
  let created = false;
  const previousSeedDocumentsDirectory =
    process.env.SEED_DOCUMENTS_DIR;
  const seedFixtureScope: DisposableFixtureDirectory | undefined =
    mode === 'seeded-upgrade'
      ? createDisposableFixtureDirectory()
      : undefined;
  if (seedFixtureScope) {
    process.env.SEED_DOCUMENTS_DIR =
      seedFixtureScope.directory;
  }

  try {
    await createDisposableDatabase(process.env, target);
    created = true;
    const inspection = await inspectDisposableDatabase(
      process.env,
      target,
    );
    if (
      inspection.tableCount !== 0 ||
      inspection.characterSet !== 'utf8mb4' ||
      inspection.collation !== 'utf8mb4_unicode_ci'
    ) {
      fail('new disposable database metadata mismatch');
    }
    if (M1B1_MIGRATIONS.length !== 3) {
      fail('canonical registry length mismatch');
    }
    if (mode === 'from-zero') {
      await runFromZero();
    } else {
      await runSeededUpgrade();
    }
  } finally {
    try {
      if (seedFixtureScope) {
        const removed =
          cleanupDisposableFixtureDirectory(seedFixtureScope);
        console.log(
          `Removed isolated seed document fixtures: ${removed}`,
        );
      }
    } finally {
      if (previousSeedDocumentsDirectory === undefined) {
        delete process.env.SEED_DOCUMENTS_DIR;
      } else {
        process.env.SEED_DOCUMENTS_DIR =
          previousSeedDocumentsDirectory;
      }
      if (created) {
        await dropDisposableDatabase(process.env, target);
        console.log(`Dropped disposable database: ${target}`);
      }
    }
  }
};

void main().catch(error => {
  const message =
    error instanceof Error &&
    (
      error.message.startsWith('M1B-1 smoke failed:') ||
      error.message.startsWith('Disposable database') ||
      error.message.startsWith(
        'Unsafe database seed configuration:',
      )
    )
      ? error.message
      : 'M1B-1 smoke failed';
  console.error(message);
  process.exitCode = 1;
});
