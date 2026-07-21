import { createHash } from 'crypto';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { CanonicalBaselineV11784500000000 } from '../canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';
import { AddShipmentOperationalConditions1784660000000 } from '../canonical-migrations/1784660000000-AddShipmentOperationalConditions';
import { AddShipmentCategoryDetails1784740000000 } from '../canonical-migrations/1784740000000-AddShipmentCategoryDetails';
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
import { CANONICAL_MIGRATIONS } from './canonicalMigrationRegistry';
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
  'AddShipmentCategoryDetails1784740000000',
] as const;

const EXPECTED_M1B2_MIGRATIONS = [
  CanonicalBaselineV11784500000000,
  AddShipmentV2IdentityCodes1784580000000,
  AddShipmentOperationalConditions1784660000000,
  AddShipmentCategoryDetails1784740000000,
] as const;

const M1B2_CANONICAL_MIGRATIONS = CANONICAL_MIGRATIONS.slice(
  0,
  MIGRATION_NAMES.length,
);

const PREVIOUS_MIGRATIONS = [
  CanonicalBaselineV11784500000000,
  AddShipmentV2IdentityCodes1784580000000,
  AddShipmentOperationalConditions1784660000000,
] as const;

const CATEGORY_TABLES = [
  'shipment_home_move_details',
  'shipment_home_move_items',
  'shipment_office_move_details',
  'shipment_partial_item_details',
  'shipment_partial_items',
] as const;

const fail = (reason: string): never => {
  throw new Error(`M1B-2 smoke failed: ${reason}`);
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
  parameters: readonly unknown[] = [],
): Promise<void> => {
  const rows = (await dataSource.query(
    statement,
    [...parameters],
  )) as unknown[];
  if (rows.length > 0) fail(reason);
};

const assertFinalMigrationState = async (
  dataSource: DataSource,
): Promise<void> => {
  const rows = (await dataSource.query(
    'SELECT name FROM `migrations` ORDER BY timestamp, id, name',
  )) as Array<{ readonly name: string }>;
  if (
    JSON.stringify(rows.map(row => String(row.name))) !==
      JSON.stringify(MIGRATION_NAMES) ||
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
  const tableRows = (await dataSource.query(
    `SELECT TABLE_NAME AS tableName
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          'shipment_home_move_details',
          'shipment_home_move_items',
          'shipment_office_move_details',
          'shipment_partial_item_details',
          'shipment_partial_items'
        )
      ORDER BY TABLE_NAME`,
  )) as Array<{ readonly tableName: string }>;
  if (
    JSON.stringify(tableRows.map(row => row.tableName)) !==
    JSON.stringify([...CATEGORY_TABLES].sort())
  ) {
    fail('category table inventory mismatch');
  }

  const foreignKeys = (await dataSource.query(
    `SELECT rc.TABLE_NAME AS tableName,
            rc.CONSTRAINT_NAME AS constraintName,
            rc.REFERENCED_TABLE_NAME AS referencedTable,
            rc.DELETE_RULE AS deleteRule,
            rc.UPDATE_RULE AS updateRule
       FROM information_schema.REFERENTIAL_CONSTRAINTS rc
      WHERE rc.CONSTRAINT_SCHEMA = DATABASE()
        AND rc.TABLE_NAME IN (
          'shipment_home_move_details',
          'shipment_home_move_items',
          'shipment_office_move_details',
          'shipment_partial_item_details',
          'shipment_partial_items'
        )
      ORDER BY rc.TABLE_NAME, rc.CONSTRAINT_NAME`,
  )) as Array<{
    readonly tableName: string;
    readonly constraintName: string;
    readonly referencedTable: string;
    readonly deleteRule: string;
    readonly updateRule: string;
  }>;
  if (
    foreignKeys.length !== 5 ||
    foreignKeys.some(
      row =>
        row.deleteRule !== 'CASCADE' ||
        row.updateRule !== 'RESTRICT',
    )
  ) {
    fail('category foreign key rule mismatch');
  }

  const compositeParts = (await dataSource.query(
    `SELECT kcu.TABLE_NAME AS tableName,
            kcu.CONSTRAINT_NAME AS constraintName,
            kcu.ORDINAL_POSITION AS position,
            kcu.COLUMN_NAME AS columnName,
            kcu.REFERENCED_COLUMN_NAME AS referencedColumn
       FROM information_schema.KEY_COLUMN_USAGE kcu
      WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
        AND kcu.CONSTRAINT_NAME IN (
          'FK_home_details_shipment_category',
          'FK_office_details_shipment_category',
          'FK_partial_details_shipment_category'
        )
      ORDER BY kcu.TABLE_NAME, kcu.ORDINAL_POSITION`,
  )) as Array<{
    readonly tableName: string;
    readonly constraintName: string;
    readonly position: number | string;
    readonly columnName: string;
    readonly referencedColumn: string;
  }>;
  if (
    compositeParts.length !== 6 ||
    compositeParts.some((row, index) => {
      const secondPart = index % 2 === 1;
      return (
        Number(row.position) !== (secondPart ? 2 : 1) ||
        row.columnName !==
          (secondPart
            ? 'service_category_code'
            : 'shipment_id') ||
        row.referencedColumn !==
          (secondPart ? 'service_category_code' : 'id')
      );
    })
  ) {
    fail('composite category foreign key mismatch');
  }

  const manifest = await inspectCanonicalSchema(
    readOnlySchemaConnectionOptionsFromEnvironment(process.env),
  );
  const counts = countCanonicalSchema(manifest);
  if (counts.tables !== 53) {
    fail('M1B-2 table count mismatch');
  }
  return {
    fingerprint: manifest.schemaFingerprint,
    counts,
  };
};

const assertCategoryInvariants = async (
  dataSource: DataSource,
  expectSeedItems: boolean,
): Promise<void> => {
  for (const [table, category] of [
    ['shipment_home_move_details', 'HOME_MOVE'],
    ['shipment_office_move_details', 'OFFICE_MOVE'],
    ['shipment_partial_item_details', 'PARTIAL_ITEM'],
  ] as const) {
    const shipmentRows = (await dataSource.query(
      `SELECT COUNT(*) AS rowCount
         FROM shipments
        WHERE service_category_code = ?`,
      [category],
    )) as Array<{ readonly rowCount: number | string }>;
    if (
      await countRows(dataSource, table) !==
      Number(shipmentRows[0]?.rowCount)
    ) {
      fail(`${table} root coverage mismatch`);
    }
    await assertNoRows(
      dataSource,
      `SELECT detail.shipment_id
         FROM \`${table}\` detail
         JOIN shipments shipment
           ON shipment.id = detail.shipment_id
        WHERE detail.service_category_code <> ?
           OR shipment.service_category_code <> ?`,
      `${table} category mismatch`,
      [category, category],
    );
  }

  await assertNoRows(
    dataSource,
    `SELECT shipment.id
       FROM shipments shipment
       LEFT JOIN shipment_home_move_details home
         ON home.shipment_id = shipment.id
       LEFT JOIN shipment_office_move_details officeDetail
         ON officeDetail.shipment_id = shipment.id
       LEFT JOIN shipment_partial_item_details partialDetail
         ON partialDetail.shipment_id = shipment.id
      WHERE shipment.shipment_category = 'STORAGE'
        AND (
          home.shipment_id IS NOT NULL
          OR officeDetail.shipment_id IS NOT NULL
          OR partialDetail.shipment_id IS NOT NULL
        )`,
    'STORAGE detail row exists',
  );
  await assertNoRows(
    dataSource,
    `SELECT item.id
       FROM shipment_home_move_items item
       LEFT JOIN shipment_home_move_details parent
         ON parent.shipment_id = item.shipment_id
      WHERE parent.shipment_id IS NULL`,
    'home item orphan',
  );
  await assertNoRows(
    dataSource,
    `SELECT item.id
       FROM shipment_partial_items item
       LEFT JOIN shipment_partial_item_details parent
         ON parent.shipment_id = item.shipment_id
      WHERE parent.shipment_id IS NULL`,
    'partial item orphan',
  );
  await assertNoRows(
    dataSource,
    `SELECT shipment_id
       FROM shipment_office_move_details
      WHERE (
        has_fixed_completion_deadline = 1
        AND completion_deadline_at IS NULL
      ) OR (
        (
          has_fixed_completion_deadline = 0
          OR has_fixed_completion_deadline IS NULL
        )
        AND completion_deadline_at IS NOT NULL
      )`,
    'office deadline semantics mismatch',
  );
  await assertNoRows(
    dataSource,
    `SELECT id
       FROM shipment_partial_items
      WHERE (
        size_class_code = 'MEASUREMENTS_PROVIDED'
        AND (
          width_cm IS NULL
          OR length_cm IS NULL
          OR height_cm IS NULL
        )
      ) OR (
        (
          width_cm IS NULL
          OR length_cm IS NULL
          OR height_cm IS NULL
        )
        AND NOT (
          width_cm IS NULL
          AND length_cm IS NULL
          AND height_cm IS NULL
        )
      )`,
    'partial measurement semantics mismatch',
  );
  await assertNoRows(
    dataSource,
    `SELECT id
       FROM (
         SELECT id, item_type_code, custom_label
           FROM shipment_home_move_items
         UNION ALL
         SELECT id, item_type_code, custom_label
           FROM shipment_partial_items
       ) item
      WHERE (
        item_type_code = 'OTHER'
        AND (
          custom_label IS NULL
          OR CHAR_LENGTH(TRIM(custom_label)) < 2
        )
      )
      OR custom_label LIKE '%@%'
      OR LOWER(custom_label) LIKE '%http%'
      OR LOWER(custom_label) LIKE '%www.%'
      OR custom_label LIKE '%<%'`,
    'unsafe or missing custom label',
  );

  const homeItemCount = await countRows(
    dataSource,
    'shipment_home_move_items',
  );
  const partialItemCount = await countRows(
    dataSource,
    'shipment_partial_items',
  );
  if (
    expectSeedItems
      ? homeItemCount === 0 || partialItemCount === 0
      : homeItemCount !== 0 || partialItemCount !== 0
  ) {
    fail('category item seed/backfill expectation mismatch');
  }
};

const runFromZero = async (): Promise<void> => {
  const dataSource = await initializeDataSource(
    M1B2_CANONICAL_MIGRATIONS,
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
    const physicalBeforeSeed =
      await assertPhysicalSchema(dataSource);
    const { withSeedDataSource } =
      await import('../../../database/seed/seedDataSource');
    const { runSeedWorkflow } =
      await import('../../../database/seed/seedWorkflow');
    await withSeedDataSource(dataSource, () =>
      runSeedWorkflow({
        clearFirst: false,
        env: process.env,
      }),
    );
    await assertCategoryInvariants(dataSource, true);
    const physicalAfterSeed =
      await assertPhysicalSchema(dataSource);
    if (
      physicalAfterSeed.fingerprint !==
      physicalBeforeSeed.fingerprint
    ) {
      fail('seed changed schema fingerprint');
    }
    console.log('M1B-2 mode: from-zero');
    console.log(`Canonical migrations: ${applied.length}`);
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log(
      `Shipment rows: ${await countRows(dataSource, 'shipments')}`,
    );
    console.log(
      `Home items: ${await countRows(dataSource, 'shipment_home_move_items')}`,
    );
    console.log(
      `Partial items: ${await countRows(dataSource, 'shipment_partial_items')}`,
    );
    console.log(
      `M1B-2 fingerprint: ${physicalAfterSeed.fingerprint}`,
    );
    console.log(
      `M1B-2 schema counts: ${JSON.stringify(physicalAfterSeed.counts)}`,
    );
    console.log('Seed invariants: PASS');
  } finally {
    await dataSource.destroy();
  }
};

const runSeededUpgrade = async (): Promise<void> => {
  const { withSeedDataSource } =
    await import('../../../database/seed/seedDataSource');
  const { runSeedWorkflow } =
    await import('../../../database/seed/seedWorkflow');
  const beforeDataSource = await initializeDataSource(
    PREVIOUS_MIGRATIONS,
  );
  const beforeCounts: Record<string, number> = {};
  let beforeShipmentHash = '';
  try {
    const applied = await beforeDataSource.runMigrations({
      transaction: 'none',
    });
    if (applied.length !== 3) {
      fail('seeded-upgrade M1B-1 setup mismatch');
    }
    await withSeedDataSource(beforeDataSource, () =>
      runSeedWorkflow({
        clearFirst: false,
        env: process.env,
      }),
    );
    for (const table of [
      'shipments',
      'offers',
      'customers',
      'carriers',
    ]) {
      beforeCounts[table] = await countRows(
        beforeDataSource,
        table,
      );
    }
    beforeShipmentHash =
      await shipmentIdFingerprint(beforeDataSource);
  } finally {
    await beforeDataSource.destroy();
  }

  const dataSource = await initializeDataSource(
    M1B2_CANONICAL_MIGRATIONS,
  );
  try {
    const applied = await dataSource.runMigrations({
      transaction: 'none',
    });
    if (
      applied.length !== 1 ||
      applied[0].name !== MIGRATION_NAMES[3]
    ) {
      fail('seeded-upgrade M1B-2 application mismatch');
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
    await assertCategoryInvariants(dataSource, false);
    await assertNoRows(
      dataSource,
      `SELECT detail.shipment_id
         FROM shipment_home_move_details detail
         JOIN shipments shipment
           ON shipment.id = detail.shipment_id
        WHERE NOT (
          detail.residence_type_code <=>
          CASE shipment.origin_place_type
            WHEN 'Daire' THEN 'APARTMENT'
            WHEN 'Apartman Dairesi' THEN 'APARTMENT'
            WHEN 'Site İçi Daire' THEN 'APARTMENT'
            WHEN 'Müstakil Ev' THEN 'DETACHED_HOUSE'
            WHEN 'Villa' THEN 'VILLA'
            ELSE NULL
          END
        )
        OR detail.room_layout_code IS NOT NULL
        OR detail.household_density_code IS NOT NULL
        OR detail.box_count_band_code IS NOT NULL`,
      'home backfill is not lossless',
    );
    await assertNoRows(
      dataSource,
      `SELECT shipment_id
         FROM shipment_office_move_details
        WHERE office_size_band_code IS NOT NULL
           OR workstation_count_band_code IS NOT NULL
           OR archive_unit_count_band_code IS NOT NULL
           OR archive_density_code IS NOT NULL
           OR has_server_room IS NOT NULL
           OR has_sensitive_electronics IS NOT NULL
           OR has_heavy_equipment IS NOT NULL
           OR requires_after_hours_move IS NOT NULL
           OR has_fixed_completion_deadline IS NOT NULL
           OR completion_deadline_at IS NOT NULL
           OR must_remain_operational IS NOT NULL`,
      'unproven office backfill value exists',
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
    const physical = await assertPhysicalSchema(dataSource);
    console.log('M1B-2 mode: seeded-upgrade');
    console.log(
      `Shipment rows before/after: ${beforeCounts.shipments}/${await countRows(dataSource, 'shipments')}`,
    );
    console.log('Shipment PK fingerprint preserved: true');
    console.log(
      `Home detail rows: ${await countRows(dataSource, 'shipment_home_move_details')}`,
    );
    console.log(
      `Office detail rows: ${await countRows(dataSource, 'shipment_office_move_details')}`,
    );
    console.log(
      `Partial detail rows: ${await countRows(dataSource, 'shipment_partial_item_details')}`,
    );
    console.log('Unproven office/partial item backfill: NULL/none');
    console.log('Legacy migrations: 0');
    console.log('Pending migrations: 0');
    console.log(`M1B-2 fingerprint: ${physical.fingerprint}`);
    console.log('Upgrade invariants: PASS');
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
  const seedFixtureScope: DisposableFixtureDirectory =
    createDisposableFixtureDirectory();
  process.env.SEED_DOCUMENTS_DIR =
    seedFixtureScope.directory;

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
      CANONICAL_MIGRATIONS.length < MIGRATION_NAMES.length ||
      M1B2_CANONICAL_MIGRATIONS.some(
        (migration, index) =>
          migration !== EXPECTED_M1B2_MIGRATIONS[index] ||
          migration.name !== MIGRATION_NAMES[index],
      )
    ) {
      fail('canonical registry M1B-2 prefix mismatch');
    }
    if (mode === 'from-zero') {
      await runFromZero();
    } else {
      await runSeededUpgrade();
    }
  } finally {
    try {
      const removed =
        cleanupDisposableFixtureDirectory(seedFixtureScope);
      console.log(
        `Removed isolated seed document fixtures: ${removed}`,
      );
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
  const reason = error instanceof Error
    ? error.message
    : 'unknown error';
  const message = reason.startsWith('M1B-2 smoke failed:') ||
    reason.startsWith('Disposable database') ||
    reason.startsWith('Unsafe database seed configuration:')
    ? reason
    : `M1B-2 smoke failed: ${reason}`;
  console.error(message);
  process.exitCode = 1;
});
