import { createHash } from 'crypto';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { CanonicalBaselineV11784500000000 } from '../canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';
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
import {
  canonicalDataSourceOptions,
} from './canonicalDataSource';
import { CANONICAL_MIGRATIONS } from './canonicalMigrationRegistry';
import {
  cleanupDisposableFixtureDirectory,
  createDisposableFixtureDirectory,
  type DisposableFixtureDirectory,
} from './disposableFixtureSafety';

config();

type SmokeMode = 'from-zero' | 'seeded-upgrade';

const BASELINE_NAME =
  'CanonicalBaselineV11784500000000';
const M1A_NAME =
  'AddShipmentV2IdentityCodes1784580000000';
const M1A_MIGRATIONS = [
  CanonicalBaselineV11784500000000,
  AddShipmentV2IdentityCodes1784580000000,
] as const;

const fail = (reason: string): never => {
  throw new Error(`M1A smoke failed: ${reason}`);
};

const requireTarget = (): string => {
  const target = process.env.DB_NAME;
  if (!target) {
    fail('DB_NAME must be explicit');
  }
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

const migrationNames = async (
  dataSource: DataSource,
): Promise<string[]> => {
  const rows = (await dataSource.query(
    'SELECT name FROM `migrations` ORDER BY timestamp, id, name',
  )) as Array<{ readonly name: string }>;
  return rows.map(row => String(row.name));
};

const sessionTimezone = async (
  dataSource: DataSource,
): Promise<string> => {
  const rows = (await dataSource.query(
    'SELECT @@session.time_zone AS sessionTimezone',
  )) as Array<{ readonly sessionTimezone: string }>;
  return String(rows[0]?.sessionTimezone);
};

const shipmentCount = async (
  dataSource: DataSource,
): Promise<number> => {
  const rows = (await dataSource.query(
    'SELECT COUNT(*) AS rowCount FROM `shipments`',
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

interface M1APhysicalResult {
  readonly fingerprint: string;
  readonly counts: ReturnType<typeof countCanonicalSchema>;
}

const initializeM1ADataSource = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    ...canonicalDataSourceOptions(process.env, {
      loadEntities: true,
    }),
    migrations: [...M1A_MIGRATIONS],
  });
  await dataSource.initialize();
  await dataSource.query(`SET SESSION time_zone = '+00:00'`);
  return dataSource;
};

const assertM1APhysicalSchema = async (
  dataSource: DataSource,
): Promise<M1APhysicalResult> => {
  const columnRows = (await dataSource.query(
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
          'service_category_code',
          'route_scope_code'
        )
      ORDER BY ORDINAL_POSITION`,
  )) as Array<{
    readonly name: string;
    readonly physicalType: string;
    readonly nullable: string;
    readonly defaultValue: string | null;
    readonly characterSet: string;
    readonly collation: string;
  }>;
  if (
    columnRows.length !== 2 ||
    columnRows.some(
      column =>
        column.physicalType.toLowerCase() !== 'varchar(32)' ||
        column.nullable !== 'YES' ||
        column.defaultValue !== null ||
        column.characterSet !== 'ascii' ||
        column.collation !== 'ascii_bin',
    )
  ) {
    fail('shipment identity column metadata mismatch');
  }

  const indexRows = (await dataSource.query(
    `SELECT INDEX_NAME AS indexName,
            NON_UNIQUE AS nonUnique,
            SEQ_IN_INDEX AS position,
            COLUMN_NAME AS columnName
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'shipments'
        AND INDEX_NAME IN (
          'IDX_shipments_service_category_code',
          'IDX_shipments_route_scope_code',
          'UQ_shipments_id_service_category_code'
        )
      ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
  )) as Array<{
    readonly indexName: string;
    readonly nonUnique: number | string;
    readonly position: number | string;
    readonly columnName: string;
  }>;
  const indexShape = indexRows.map(row => [
    row.indexName,
    Number(row.nonUnique),
    Number(row.position),
    row.columnName,
  ]);
  const expectedIndexShape = [
    ['IDX_shipments_route_scope_code', 1, 1, 'route_scope_code'],
    ['IDX_shipments_service_category_code', 1, 1, 'service_category_code'],
    ['UQ_shipments_id_service_category_code', 0, 1, 'id'],
    ['UQ_shipments_id_service_category_code', 0, 2, 'service_category_code'],
  ];
  if (
    JSON.stringify(indexShape) !==
    JSON.stringify(expectedIndexShape)
  ) {
    fail('shipment identity index metadata mismatch');
  }

  const checkRows = (await dataSource.query(
    `SELECT tc.CONSTRAINT_NAME AS constraintName,
            cc.CHECK_CLAUSE AS checkClause
       FROM information_schema.TABLE_CONSTRAINTS tc
       JOIN information_schema.CHECK_CONSTRAINTS cc
         ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
        AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
      WHERE tc.TABLE_SCHEMA = DATABASE()
        AND tc.TABLE_NAME = 'shipments'
        AND tc.CONSTRAINT_NAME IN (
          'CHK_shipments_service_category_code',
          'CHK_shipments_route_scope_code'
        )
      ORDER BY tc.CONSTRAINT_NAME`,
  )) as Array<{
    readonly constraintName: string;
    readonly checkClause: string;
  }>;
  if (checkRows.length !== 2) {
    fail('shipment identity CHECK metadata mismatch');
  }
  const checks = new Map(
    checkRows.map(row => [
      row.constraintName,
      row.checkClause.toUpperCase(),
    ]),
  );
  const serviceCheck =
    checks.get('CHK_shipments_service_category_code') ?? '';
  const routeCheck =
    checks.get('CHK_shipments_route_scope_code') ?? '';
  for (const code of [
    'HOME_MOVE',
    'OFFICE_MOVE',
    'PARTIAL_ITEM',
  ]) {
    if (!serviceCheck.includes(code)) {
      fail('service category CHECK allowlist mismatch');
    }
  }
  for (const code of ['INTRACITY', 'INTERCITY']) {
    if (!routeCheck.includes(code)) {
      fail('route scope CHECK allowlist mismatch');
    }
  }

  const manifest = await inspectCanonicalSchema(
    readOnlySchemaConnectionOptionsFromEnvironment(process.env),
  );
  const counts = countCanonicalSchema(manifest);
  if (
    counts.tables !== 47 ||
    counts.columns !== 484 ||
    counts.indexes !== 130 ||
    counts.foreignKeys !== 45 ||
    counts.uniqueConstraints !== 35 ||
    counts.checkConstraints !== 4
  ) {
    fail('M1A schema counts mismatch');
  }
  return {
    fingerprint: manifest.schemaFingerprint,
    counts,
  };
};

const assertFinalMigrationState = async (
  dataSource: DataSource,
): Promise<void> => {
  const names = await migrationNames(dataSource);
  if (
    JSON.stringify(names) !==
      JSON.stringify([BASELINE_NAME, M1A_NAME]) ||
    await dataSource.showMigrations()
  ) {
    fail('canonical migration history mismatch');
  }
  if (await sessionTimezone(dataSource) !== '+00:00') {
    fail('session timezone mismatch');
  }
};

const runFromZero = async (): Promise<void> => {
  const dataSource = await initializeM1ADataSource();
  try {
    const applied = await dataSource.runMigrations({
      transaction: 'none',
    });
    if (
      JSON.stringify(applied.map(item => item.name)) !==
      JSON.stringify([BASELINE_NAME, M1A_NAME])
    ) {
      fail('from-zero applied migration order mismatch');
    }
    await assertFinalMigrationState(dataSource);
    const physical = await assertM1APhysicalSchema(dataSource);
    console.log('M1A mode: from-zero');
    console.log(`Applied migrations: ${applied.length}`);
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log(`M1A fingerprint: ${physical.fingerprint}`);
    console.log(`M1A schema counts: ${JSON.stringify(physical.counts)}`);
  } finally {
    await dataSource.destroy();
  }
};

const runSeededUpgrade = async (): Promise<void> => {
  const [
    { withSeedDataSource },
    { runSeedWorkflow },
    { collectCanonicalSeedSummary },
  ] = await Promise.all([
    import('../../../database/seed/seedDataSource'),
    import('../../../database/seed/seedWorkflow'),
    import('./canonicalSeedHarness'),
  ]);
  const baselineDataSource = new DataSource({
    ...canonicalDataSourceOptions(process.env, {
      loadEntities: true,
    }),
    migrations: [CanonicalBaselineV11784500000000],
  });
  await baselineDataSource.initialize();
  await baselineDataSource.query(
    `SET SESSION time_zone = '+00:00'`,
  );

  let beforeCount = 0;
  let beforeIdFingerprint = '';
  try {
    const applied = await baselineDataSource.runMigrations({
      transaction: 'none',
    });
    if (
      applied.length !== 1 ||
      applied[0].name !== BASELINE_NAME
    ) {
      fail('seeded-upgrade baseline application mismatch');
    }
    await withSeedDataSource(baselineDataSource, () =>
      runSeedWorkflow({ clearFirst: false, env: process.env }),
    );
    await collectCanonicalSeedSummary(
      baselineDataSource,
      process.env,
    );
    beforeCount = await shipmentCount(baselineDataSource);
    beforeIdFingerprint =
      await shipmentIdFingerprint(baselineDataSource);
    if (beforeCount !== 2000) {
      fail('seeded-upgrade initial shipment count mismatch');
    }
    await assertNoRows(
      baselineDataSource,
      `SELECT name
         FROM extra_services
        GROUP BY name
       HAVING COUNT(*) > 1`,
      'seed duplicate extra service invariant',
    );
  } finally {
    await baselineDataSource.destroy();
  }

  const dataSource = await initializeM1ADataSource();
  try {
    const applied = await dataSource.runMigrations({
      transaction: 'none',
    });
    if (
      applied.length !== 1 ||
      applied[0].name !== M1A_NAME
    ) {
      fail('seeded-upgrade M1A application mismatch');
    }
    await assertFinalMigrationState(dataSource);
    const afterCount = await shipmentCount(dataSource);
    const afterIdFingerprint =
      await shipmentIdFingerprint(dataSource);
    if (
      afterCount !== beforeCount ||
      afterIdFingerprint !== beforeIdFingerprint
    ) {
      fail('shipment row or primary-key preservation mismatch');
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

    const categoryRows = await dataSource.query(
      `SELECT COALESCE(service_category_code, '<NULL>') AS code,
              COUNT(*) AS rowCount
         FROM shipments
        GROUP BY service_category_code
        ORDER BY service_category_code`,
    );
    const routeRows = await dataSource.query(
      `SELECT COALESCE(route_scope_code, '<NULL>') AS code,
              COUNT(*) AS rowCount
         FROM shipments
        GROUP BY route_scope_code
        ORDER BY route_scope_code`,
    );
    const physical = await assertM1APhysicalSchema(dataSource);
    console.log('M1A mode: seeded-upgrade');
    console.log(`Shipment rows before/after: ${beforeCount}/${afterCount}`);
    console.log(`Category distribution: ${JSON.stringify(categoryRows)}`);
    console.log(`Route distribution: ${JSON.stringify(routeRows)}`);
    console.log('Seed invariants: PASS');
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log(`M1A fingerprint: ${physical.fingerprint}`);
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
    if (
      CANONICAL_MIGRATIONS[0] !== M1A_MIGRATIONS[0] ||
      CANONICAL_MIGRATIONS[1] !== M1A_MIGRATIONS[1]
    ) {
      fail('canonical registry M1A prefix mismatch');
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
        console.log(`Removed isolated seed document fixtures: ${removed}`);
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
    (error.message.startsWith('M1A smoke failed:') ||
      error.message.startsWith('Disposable database') ||
      error.message.startsWith('Unsafe database seed configuration:'))
      ? error.message
      : 'M1A smoke failed';
  console.error(message);
  process.exitCode = 1;
});
