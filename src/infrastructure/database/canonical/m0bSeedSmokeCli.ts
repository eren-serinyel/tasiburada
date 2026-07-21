import { config } from 'dotenv';
import {
  clearDatabase,
} from '../../../database/seed/clearDatabase';
import { cleanupSeededDocumentFiles } from '../../../database/seed/helpers/pdfHelper';
import { withSeedDataSource } from '../../../database/seed/seedDataSource';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
} from '../disposable/disposableMysqlHarness';
import {
  CANONICAL_MIGRATION_NAME,
  canonicalDatabaseNameFromEnvironment,
  initializeCanonicalDataSource,
} from './canonicalDataSource';
import {
  assertCanonicalApplicationTablesEmpty,
  seedCanonicalDatabase,
} from './canonicalSeedHarness';
import { verifyCanonicalDatabase } from './canonicalVerification';

config();

const requireEqual = (
  actual: unknown,
  expected: unknown,
  reason: string,
): void => {
  if (actual !== expected) {
    throw new Error(`M0B-2A seed smoke failed: ${reason}`);
  }
};

const main = async (): Promise<void> => {
  const env = process.env;
  const target = canonicalDatabaseNameFromEnvironment(env);
  const seedEnvironment = { ...env, DB_NAME: target };
  let created = false;

  try {
    await createDisposableDatabase(env, target);
    created = true;

    const migrationDataSource = await initializeCanonicalDataSource(env);
    try {
      const applied = await migrationDataSource.runMigrations({
        transaction: 'none',
      });
      requireEqual(applied.length, 1, 'canonical migration count');
      requireEqual(
        applied[0].name,
        CANONICAL_MIGRATION_NAME,
        'canonical migration name',
      );
    } finally {
      await migrationDataSource.destroy();
    }

    const baselineVerification = await verifyCanonicalDatabase(env);
    requireEqual(
      baselineVerification.schemaDifferences.length,
      0,
      'baseline schema verification',
    );

    const first = await seedCanonicalDatabase(env);

    const clearDataSource = await initializeCanonicalDataSource(env, {
      loadEntities: true,
    });
    try {
      await withSeedDataSource(clearDataSource, () =>
        clearDatabase(seedEnvironment),
      );
      await assertCanonicalApplicationTablesEmpty(clearDataSource);
      const migrationRows = (await clearDataSource.query(
        'SELECT name FROM `migrations` ORDER BY timestamp, id, name',
      )) as Array<{ readonly name: string }>;
      requireEqual(migrationRows.length, 1, 'migration row after clear');
      requireEqual(
        migrationRows[0].name,
        CANONICAL_MIGRATION_NAME,
        'canonical migration after clear',
      );
    } finally {
      await clearDataSource.destroy();
    }

    const second = await seedCanonicalDatabase(env);
    requireEqual(
      JSON.stringify(second.summary),
      JSON.stringify(first.summary),
      'stable seed summary after reseed',
    );
    requireEqual(
      second.fingerprintAfter,
      first.fingerprintAfter,
      'schema fingerprint after reseed',
    );

    console.log(`M0B-2A disposable database: ${target}`);
    console.log(`Canonical migration count: ${second.summary.canonicalMigrationCount}`);
    console.log(`Legacy migration count: ${second.summary.legacyMigrationCount}`);
    console.log(`Schema fingerprint: ${second.summary.schemaFingerprint}`);
    console.log(`Stable table counts: ${JSON.stringify(second.summary.tableCounts)}`);
    console.log('First seed invariants: PASS');
    console.log('Clear and migration preservation: PASS');
    console.log('Reseed invariants and stable summary: PASS');
  } finally {
    try {
      const removedSeedFiles = cleanupSeededDocumentFiles();
      console.log(`Removed seed document fixtures: ${removedSeedFiles}`);
    } finally {
      if (created) {
        await dropDisposableDatabase(env, target);
        console.log(`Dropped disposable database: ${target}`);
      }
    }
  }
};

void main().catch(error => {
  const message =
    error instanceof Error &&
    (error.message.startsWith('M0B-2A seed smoke failed:') ||
      error.message.startsWith('Canonical seed') ||
      error.message.startsWith('Canonical clear') ||
      error.message.startsWith('Disposable database'))
      ? error.message
      : 'M0B-2A seed smoke failed';
  console.error(message);
  process.exitCode = 1;
});
