import type { DataSource } from 'typeorm';
import {
  runSeedWorkflow,
  type SeedWorkflowResult,
} from '../../../database/seed/seedWorkflow';
import { withSeedDataSource } from '../../../database/seed/seedDataSource';
import { EXTRA_SERVICE_CATALOG } from '../../../application/services/extra-services/extraServiceApplicability';
import {
  CANONICAL_CLEAR_TABLES,
} from '../../../database/seed/clearDatabase';
import {
  CANONICAL_MIGRATION_NAME,
  canonicalDatabaseNameFromEnvironment,
  initializeCanonicalDataSource,
} from './canonicalDataSource';
import { verifyCanonicalDatabase } from './canonicalVerification';
import {
  assertSafeDisposableDatabaseTarget,
  type DisposableDatabaseEnvironment,
} from '../disposable/disposableDatabaseSafety';

export const CANONICAL_V1_FINGERPRINT =
  'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1';

export interface CanonicalSeedSummary {
  readonly tableCounts: Readonly<Record<string, number>>;
  readonly naturalKeys: {
    readonly extraServices: readonly string[];
    readonly vehicleTypes: readonly string[];
    readonly serviceTypes: readonly string[];
    readonly scopesOfWork: readonly string[];
  };
  readonly canonicalMigrationCount: number;
  readonly legacyMigrationCount: number;
  readonly schemaFingerprint: string;
}

export interface CanonicalSeedHarnessResult {
  readonly workflow: SeedWorkflowResult;
  readonly summary: CanonicalSeedSummary;
  readonly fingerprintBefore: string;
  readonly fingerprintAfter: string;
}

const requireCanonicalSchema = async (
  env: DisposableDatabaseEnvironment,
): Promise<string> => {
  const verification = await verifyCanonicalDatabase(env);
  if (
    verification.schemaDifferences.length > 0 ||
    verification.current.schemaFingerprint !== CANONICAL_V1_FINGERPRINT
  ) {
    throw new Error('Canonical seed harness rejected a schema mismatch');
  }
  return verification.current.schemaFingerprint;
};

const countRows = async (
  dataSource: DataSource,
  tableName: string,
): Promise<number> => {
  const rows = (await dataSource.query(
    `SELECT COUNT(*) AS rowCount FROM \`${tableName}\``,
  )) as Array<{ readonly rowCount: number | string }>;
  return Number(rows[0].rowCount);
};

const readNames = async (
  dataSource: DataSource,
  tableName: string,
): Promise<string[]> => {
  const rows = (await dataSource.query(
    `SELECT name FROM \`${tableName}\` ORDER BY name`,
  )) as Array<{ readonly name: string }>;
  return rows.map(row => String(row.name));
};

const assertNoRows = async (
  dataSource: DataSource,
  statement: string,
  reason: string,
): Promise<void> => {
  const rows = (await dataSource.query(statement)) as unknown[];
  if (rows.length > 0) {
    throw new Error(`Canonical seed invariant failed: ${reason}`);
  }
};

export const collectCanonicalSeedSummary = async (
  dataSource: DataSource,
  env: DisposableDatabaseEnvironment,
): Promise<CanonicalSeedSummary> => {
  const stableCountTables = [
    'platform_settings',
    'vehicle_types',
    'service_types',
    'scope_of_work',
    'extra_services',
    'extra_service_applicability',
    'converter_item_catalog',
    'converter_vehicle_rules',
    'admins',
    'carriers',
    'customers',
    'shipments',
  ] as const;
  const tableCounts: Record<string, number> = {};
  for (const tableName of stableCountTables) {
    tableCounts[tableName] = await countRows(dataSource, tableName);
    if (tableCounts[tableName] === 0) {
      throw new Error(
        `Canonical seed invariant failed: ${tableName} is empty`,
      );
    }
  }

  await assertNoRows(
    dataSource,
    `SELECT name
       FROM extra_services
      GROUP BY name
     HAVING COUNT(*) > 1`,
    'duplicate extra_services.name',
  );
  await assertNoRows(
    dataSource,
    `SELECT extra_service_id, load_type
       FROM extra_service_applicability
      GROUP BY extra_service_id, load_type
     HAVING COUNT(*) > 1`,
    'duplicate extra service applicability',
  );
  await assertNoRows(
    dataSource,
    `SELECT carrier_id, extra_service_id, load_type
       FROM carrier_extra_service_capabilities
      GROUP BY carrier_id, extra_service_id, load_type
     HAVING COUNT(*) > 1`,
    'duplicate carrier extra service capability',
  );

  const orphanChecks = [
    {
      reason: 'extra service applicability orphan',
      sql: `SELECT child.id
              FROM extra_service_applicability child
              LEFT JOIN extra_services parent
                ON parent.id = child.extra_service_id
             WHERE parent.id IS NULL`,
    },
    {
      reason: 'carrier capability orphan',
      sql: `SELECT child.id
              FROM carrier_extra_service_capabilities child
              LEFT JOIN carriers carrier
                ON carrier.id = child.carrier_id
              LEFT JOIN extra_services service
                ON service.id = child.extra_service_id
             WHERE carrier.id IS NULL OR service.id IS NULL`,
    },
    {
      reason: 'shipment extra service orphan',
      sql: `SELECT child.shipment_id
              FROM shipment_extra_services child
              LEFT JOIN shipments shipment
                ON shipment.id = child.shipment_id
              LEFT JOIN extra_services service
                ON service.id = child.extra_service_id
             WHERE shipment.id IS NULL OR service.id IS NULL`,
    },
    {
      reason: 'offer orphan',
      sql: `SELECT child.id
              FROM offers child
              LEFT JOIN shipments shipment ON shipment.id = child.shipmentId
              LEFT JOIN carriers carrier ON carrier.id = child.carrierId
             WHERE shipment.id IS NULL OR carrier.id IS NULL`,
    },
    {
      reason: 'carrier vehicle orphan',
      sql: `SELECT child.id
              FROM carrier_vehicles child
              LEFT JOIN carriers parent ON parent.id = child.carrier_id
             WHERE parent.id IS NULL`,
    },
  ] as const;
  for (const check of orphanChecks) {
    await assertNoRows(dataSource, check.sql, check.reason);
  }

  const migrationRows = (await dataSource.query(
    'SELECT name FROM `migrations` ORDER BY timestamp, id, name',
  )) as Array<{ readonly name: string }>;
  const canonicalMigrationCount = migrationRows.filter(
    row => row.name === CANONICAL_MIGRATION_NAME,
  ).length;
  const legacyMigrationCount =
    migrationRows.length - canonicalMigrationCount;
  if (canonicalMigrationCount !== 1 || legacyMigrationCount !== 0) {
    throw new Error('Canonical seed invariant failed: migration history');
  }

  const extraServices = await readNames(
    dataSource,
    'extra_services',
  );
  const expectedExtraServices = [...EXTRA_SERVICE_CATALOG].sort();
  if (
    JSON.stringify(extraServices) !== JSON.stringify(expectedExtraServices)
  ) {
    throw new Error('Canonical seed invariant failed: extra service catalog');
  }

  const schemaFingerprint = await requireCanonicalSchema(env);
  return {
    tableCounts,
    naturalKeys: {
      extraServices,
      vehicleTypes: await readNames(dataSource, 'vehicle_types'),
      serviceTypes: await readNames(dataSource, 'service_types'),
      scopesOfWork: await readNames(dataSource, 'scope_of_work'),
    },
    canonicalMigrationCount,
    legacyMigrationCount,
    schemaFingerprint,
  };
};

export const assertCanonicalApplicationTablesEmpty = async (
  dataSource: DataSource,
): Promise<void> => {
  for (const tableName of CANONICAL_CLEAR_TABLES) {
    if ((await countRows(dataSource, tableName)) !== 0) {
      throw new Error(
        `Canonical clear invariant failed: ${tableName} is not empty`,
      );
    }
  }
};

export const seedCanonicalDatabase = async (
  env: DisposableDatabaseEnvironment = process.env,
): Promise<CanonicalSeedHarnessResult> => {
  const target = canonicalDatabaseNameFromEnvironment(env);
  assertSafeDisposableDatabaseTarget(env, target, 'CONNECT');
  const fingerprintBefore = await requireCanonicalSchema(env);
  const seedEnvironment = {
    ...env,
    DB_NAME: target,
  };

  const dataSource = await initializeCanonicalDataSource(env, {
    loadEntities: true,
  });
  try {
    const workflow = await withSeedDataSource(dataSource, () =>
      runSeedWorkflow({ clearFirst: false, env: seedEnvironment }),
    );
    const summary = await collectCanonicalSeedSummary(dataSource, env);
    const fingerprintAfter = summary.schemaFingerprint;
    if (fingerprintAfter !== fingerprintBefore) {
      throw new Error('Canonical seed harness changed the schema fingerprint');
    }
    return {
      workflow,
      summary,
      fingerprintBefore,
      fingerprintAfter,
    };
  } finally {
    await dataSource.destroy();
  }
};
