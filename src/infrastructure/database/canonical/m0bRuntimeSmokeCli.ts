import { config } from 'dotenv';
import { cleanupSeededDocumentFiles } from '../../../database/seed/helpers/pdfHelper';
import { withSeedDataSource } from '../../../database/seed/seedDataSource';
import { runSeedWorkflow } from '../../../database/seed/seedWorkflow';
import { AppDataSource } from '../data-source';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
  inspectDisposableDatabase,
} from '../disposable/disposableMysqlHarness';
import {
  assertSafeDisposableDatabaseTarget,
} from '../disposable/disposableDatabaseSafety';
import {
  CANONICAL_MIGRATION_NAME,
} from './canonicalMigrationRegistry';
import {
  CANONICAL_V1_FINGERPRINT,
  collectCanonicalSeedSummary,
} from './canonicalSeedHarness';
import { verifyCanonicalDatabase } from './canonicalVerification';

config();

const fail = (reason: string): never => {
  throw new Error(`M0B-2B runtime smoke failed: ${reason}`);
};

const main = async (): Promise<void> => {
  const env = process.env;
  const target = env.DB_NAME;
  if (
    !target ||
    env.DISPOSABLE_DB_NAME !== target ||
    env.CANONICAL_DB_NAME !== target
  ) {
    fail('DB_NAME, DISPOSABLE_DB_NAME and CANONICAL_DB_NAME must match');
  }
  assertSafeDisposableDatabaseTarget(env, target, 'CONNECT');
  let created = false;

  try {
    await createDisposableDatabase(env, target);
    created = true;
    const inspection = await inspectDisposableDatabase(env, target);
    if (
      inspection.characterSet !== 'utf8mb4' ||
      inspection.collation !== 'utf8mb4_unicode_ci' ||
      inspection.tableCount !== 0
    ) {
      fail('new database metadata mismatch');
    }

    await AppDataSource.initialize();
    const applied = await AppDataSource.runMigrations({
      transaction: 'none',
    });
    if (
      applied.length !== 1 ||
      applied[0].name !== CANONICAL_MIGRATION_NAME
    ) {
      fail('runtime canonical migration mismatch');
    }

    const seedResult = await withSeedDataSource(AppDataSource, () =>
      runSeedWorkflow({ clearFirst: false, env }),
    );
    const summary = await collectCanonicalSeedSummary(AppDataSource, env);
    if (summary.schemaFingerprint !== CANONICAL_V1_FINGERPRINT) {
      fail('schema fingerprint mismatch');
    }

    const timezoneRows = (await AppDataSource.query(
      'SELECT @@session.time_zone AS sessionTimezone',
    )) as Array<{ readonly sessionTimezone: string }>;
    if (String(timezoneRows[0]?.sessionTimezone) !== '+00:00') {
      fail('runtime session timezone mismatch');
    }
    if (await AppDataSource.showMigrations()) {
      fail('pending canonical migration remains');
    }

    const migrationRows = (await AppDataSource.query(
      'SELECT name FROM `migrations` ORDER BY timestamp, id, name',
    )) as Array<{ readonly name: string }>;
    const canonicalCount = migrationRows.filter(
      row => row.name === CANONICAL_MIGRATION_NAME,
    ).length;
    const legacyCount = migrationRows.length - canonicalCount;
    if (canonicalCount !== 1 || legacyCount !== 0) {
      fail('migration history mismatch');
    }

    const [vehicleTypes, extraServices] = await Promise.all([
      AppDataSource.query('SELECT name FROM vehicle_types ORDER BY name'),
      AppDataSource.query('SELECT name FROM extra_services ORDER BY name'),
    ]);
    if (vehicleTypes.length === 0 || extraServices.length === 0) {
      fail('catalog bootstrap read mismatch');
    }

    const verification = await verifyCanonicalDatabase(env);
    if (
      verification.schemaDifferences.length > 0 ||
      verification.counts.tables !== 47
    ) {
      fail('canonical verification mismatch');
    }

    console.log(`M0B-2B runtime disposable database: ${target}`);
    console.log(`Canonical migration count: ${canonicalCount}`);
    console.log(`Legacy migration count: ${legacyCount}`);
    console.log('Pending migration count: 0');
    console.log('Runtime session timezone: +00:00');
    console.log(`Application tables: ${verification.counts.tables - 1}`);
    console.log(`Total tables: ${verification.counts.tables}`);
    console.log(`Schema fingerprint: ${summary.schemaFingerprint}`);
    console.log(
      `Seed counts: carriers=${seedResult.carriers.length}, customers=${seedResult.customers.length}, shipments=${seedResult.shipments.length}`,
    );
    console.log('Runtime DataSource bootstrap reads: PASS');
  } finally {
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
      }
      const removed = cleanupSeededDocumentFiles();
      console.log(`Removed seed document fixtures: ${removed}`);
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
    (error.message.startsWith('M0B-2B runtime smoke failed:') ||
      error.message.startsWith('Disposable database'))
      ? error.message
      : 'M0B-2B runtime smoke failed';
  console.error(message);
  process.exitCode = 1;
});
