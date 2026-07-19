import { config } from 'dotenv';
import mysql, { type RowDataPacket } from 'mysql2/promise';
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
import {
  createDisposableDatabase,
  dropDisposableDatabase,
  inspectDisposableDatabase,
} from '../disposable/disposableMysqlHarness';
import { CANONICAL_APPLICATION_TABLES } from '../canonical-migrations/1784500000000-CanonicalBaselineV1';

config();

const EXPECTED_FINGERPRINT =
  'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1';

const fail = (reason: string): never => {
  throw new Error(`M0B smoke failed: ${reason}`);
};

const requireEqual = (
  actual: unknown,
  expected: unknown,
  reason: string,
): void => {
  if (actual !== expected) {
    fail(reason);
  }
};

const connectionOptions = (
  env: DisposableDatabaseEnvironment,
  database: string,
) => ({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USERNAME ?? 'root',
  password: env.DB_PASSWORD ?? '',
  database,
  charset: 'utf8mb4',
});

const runFromZeroSmoke = async (
  env: DisposableDatabaseEnvironment,
): Promise<void> => {
  const target = canonicalDatabaseNameFromEnvironment(env);
  let created = false;

  try {
    await createDisposableDatabase(env, target);
    created = true;
    const inspection = await inspectDisposableDatabase(env, target);
    requireEqual(inspection.mysqlVersion, '8.0.46', 'unexpected MySQL version');
    requireEqual(inspection.characterSet, 'utf8mb4', 'unexpected DB charset');
    requireEqual(
      inspection.collation,
      'utf8mb4_unicode_ci',
      'unexpected DB collation',
    );
    requireEqual(inspection.tableCount, 0, 'new database is not empty');

    const firstDataSource = await initializeCanonicalDataSource(env);
    let firstApplied: Awaited<
      ReturnType<typeof firstDataSource.runMigrations>
    > = [];
    let migrationRows: Array<{ readonly name: string }> = [];
    let sessionTimezone = '';
    try {
      firstApplied = await firstDataSource.runMigrations({
        transaction: 'none',
      });
      migrationRows = (await firstDataSource.query(
        'SELECT id, timestamp, name FROM `migrations` ORDER BY timestamp, id, name',
      )) as Array<{ readonly name: string }>;
      const timezoneRows = (await firstDataSource.query(
        'SELECT @@session.time_zone AS sessionTimezone',
      )) as Array<{ readonly sessionTimezone: string }>;
      sessionTimezone = String(timezoneRows[0].sessionTimezone);

      let seededRows = 0;
      for (const tableName of CANONICAL_APPLICATION_TABLES) {
        const rows = (await firstDataSource.query(
          `SELECT COUNT(*) AS rowCount FROM \`${tableName}\``,
        )) as Array<{ readonly rowCount: number | string }>;
        seededRows += Number(rows[0].rowCount);
      }
      requireEqual(seededRows, 0, 'baseline inserted application row data');
    } finally {
      await firstDataSource.destroy();
    }

    requireEqual(firstApplied.length, 1, 'first run did not apply one migration');
    requireEqual(
      firstApplied[0].name,
      CANONICAL_MIGRATION_NAME,
      'unexpected canonical migration applied',
    );
    requireEqual(migrationRows.length, 1, 'migration history row count mismatch');
    requireEqual(
      migrationRows[0].name,
      CANONICAL_MIGRATION_NAME,
      'legacy migration appeared in history',
    );
    requireEqual(sessionTimezone, '+00:00', 'session timezone is not UTC');

    const firstVerification = await verifyCanonicalDatabase(env);
    requireEqual(
      firstVerification.schemaDifferences.length,
      0,
      'canonical schema mismatch',
    );
    requireEqual(
      firstVerification.current.schemaFingerprint,
      EXPECTED_FINGERPRINT,
      'canonical fingerprint mismatch',
    );
    requireEqual(firstVerification.counts.tables, 47, 'table count mismatch');
    requireEqual(firstVerification.counts.columns, 482, 'column count mismatch');
    requireEqual(firstVerification.counts.indexes, 127, 'index count mismatch');
    requireEqual(
      firstVerification.counts.foreignKeys,
      45,
      'foreign key count mismatch',
    );
    requireEqual(
      firstVerification.counts.uniqueConstraints,
      34,
      'unique constraint count mismatch',
    );
    requireEqual(
      firstVerification.counts.checkConstraints,
      2,
      'check constraint count mismatch',
    );

    const secondDataSource = await initializeCanonicalDataSource(env);
    let secondAppliedCount = -1;
    let pending = true;
    try {
      const secondApplied = await secondDataSource.runMigrations({
        transaction: 'none',
      });
      secondAppliedCount = secondApplied.length;
      pending = await secondDataSource.showMigrations();
    } finally {
      await secondDataSource.destroy();
    }
    requireEqual(secondAppliedCount, 0, 'second run applied a migration');
    requireEqual(pending, false, 'pending canonical migration remains');

    const secondVerification = await verifyCanonicalDatabase(env);
    requireEqual(
      secondVerification.current.schemaFingerprint,
      EXPECTED_FINGERPRINT,
      'second fingerprint changed',
    );

    console.log(`M0B disposable database: ${target}`);
    console.log(
      `Database charset/collation: ${inspection.characterSet}/${inspection.collation}`,
    );
    console.log(`Session timezone: ${sessionTimezone}`);
    console.log(`Applied canonical migration: ${migrationRows[0].name}`);
    console.log(
      `Schema counts: tables=${firstVerification.counts.tables}, columns=${firstVerification.counts.columns}, indexes=${firstVerification.counts.indexes}, foreignKeys=${firstVerification.counts.foreignKeys}, uniqueConstraints=${firstVerification.counts.uniqueConstraints}, checks=${firstVerification.counts.checkConstraints}`,
    );
    console.log(`Schema fingerprint: ${EXPECTED_FINGERPRINT}`);
    console.log('Canonical schema verification: MATCH');
    console.log(
      `Canonical provenance verification: ${
        firstVerification.provenanceDifferences.length > 0
          ? 'DIFFERENT (warning)'
          : 'MATCH'
      }`,
    );
    console.log('Second migration run: pending-free');
  } finally {
    if (created) {
      await dropDisposableDatabase(env, target);
      console.log(`Dropped disposable database: ${target}`);
    }
  }
};

const runNonEmptyPreflightSmoke = async (
  env: DisposableDatabaseEnvironment,
): Promise<void> => {
  const target = canonicalDatabaseNameFromEnvironment(env);
  let created = false;

  try {
    await createDisposableDatabase(env, target);
    created = true;
    assertSafeDisposableDatabaseTarget(env, target, 'CONNECT');
    const connection = await mysql.createConnection(
      connectionOptions(env, target),
    );
    try {
      await connection.query(
        'CREATE TABLE `m0b_non_empty_sentinel` (`id` int NOT NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
      );
    } finally {
      await connection.end();
    }

    const dataSource = await initializeCanonicalDataSource(env);
    let rejected = false;
    try {
      await dataSource.runMigrations({ transaction: 'none' });
    } catch (error) {
      rejected =
        error instanceof Error &&
        error.message.includes('CANONICAL_BASELINE_REQUIRES_EMPTY_SCHEMA');
    } finally {
      await dataSource.destroy();
    }
    requireEqual(rejected, true, 'non-empty schema was not rejected');

    assertSafeDisposableDatabaseTarget(env, target, 'CONNECT');
    const inspectionConnection = await mysql.createConnection(
      connectionOptions(env, target),
    );
    try {
      const [rows] = await inspectionConnection.execute<RowDataPacket[]>(
        `SELECT TABLE_NAME AS tableName
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE'
          ORDER BY TABLE_NAME`,
        [target],
      );
      const tableNames = rows.map(row => String(row.tableName));
      const unexpected = tableNames.filter(
        tableName =>
          tableName !== 'migrations' &&
          tableName !== 'm0b_non_empty_sentinel',
      );
      requireEqual(
        unexpected.length,
        0,
        'baseline mutated non-empty schema before rejection',
      );
      console.log('Non-empty preflight: CANONICAL_BASELINE_REQUIRES_EMPTY_SCHEMA');
      console.log(`Tables after rejection: ${tableNames.join(',')}`);
    } finally {
      await inspectionConnection.end();
    }
  } finally {
    if (created) {
      await dropDisposableDatabase(env, target);
      console.log(`Dropped disposable database: ${target}`);
    }
  }
};

const main = async (): Promise<void> => {
  const command = process.argv[2];
  if (command === 'from-zero') {
    await runFromZeroSmoke(process.env);
  } else if (command === 'preflight') {
    await runNonEmptyPreflightSmoke(process.env);
  } else {
    throw new Error('M0B smoke command must be from-zero or preflight');
  }
};

main().catch(error => {
  const message =
    error instanceof Error &&
    (error.message.startsWith('M0B smoke failed:') ||
      error.message.startsWith('Disposable database safety check failed:') ||
      error.message.startsWith('Disposable database error:'))
      ? error.message
      : 'M0B smoke failed';
  console.error(message);
  process.exitCode = 1;
});
