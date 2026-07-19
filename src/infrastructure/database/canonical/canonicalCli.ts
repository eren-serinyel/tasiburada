import { config } from 'dotenv';
import {
  CANONICAL_MIGRATION_NAME,
  initializeCanonicalDataSource,
} from './canonicalDataSource';
import { verifyCanonicalDatabase } from './canonicalVerification';

config();

const migrate = async (): Promise<void> => {
  const dataSource = await initializeCanonicalDataSource(process.env);
  try {
    const applied = await dataSource.runMigrations({ transaction: 'none' });
    console.log(`Canonical migrations applied: ${applied.length}`);
    applied.forEach(migration =>
      console.log(`Applied canonical migration: ${migration.name}`),
    );
  } finally {
    await dataSource.destroy();
  }
};

const show = async (): Promise<void> => {
  const dataSource = await initializeCanonicalDataSource(process.env);
  try {
    const pending = await dataSource.showMigrations();
    const rows = (await dataSource.query(
      'SELECT id, timestamp, name FROM `migrations` ORDER BY timestamp, id, name',
    )) as Array<{ readonly name: string }>;
    const timezoneRows = (await dataSource.query(
      'SELECT @@session.time_zone AS sessionTimezone',
    )) as Array<{ readonly sessionTimezone: string }>;

    console.log(`Canonical pending migrations: ${pending ? 'yes' : 'no'}`);
    console.log(`Applied canonical migration rows: ${rows.length}`);
    rows.forEach(row => console.log(`Canonical migration row: ${row.name}`));
    console.log(`Canonical session timezone: ${timezoneRows[0].sessionTimezone}`);
  } finally {
    await dataSource.destroy();
  }
};

const verify = async (): Promise<void> => {
  const result = await verifyCanonicalDatabase(process.env);
  if (result.schemaDifferences.length > 0) {
    console.error('Canonical schema verification: DIFFERENT');
    result.schemaDifferences
      .slice(0, 25)
      .forEach(difference => console.error(`- ${difference}`));
    process.exitCode = 1;
  } else {
    console.log('Canonical schema verification: MATCH');
    console.log(
      `Canonical schema fingerprint: ${result.current.schemaFingerprint}`,
    );
  }

  if (result.provenanceDifferences.length > 0) {
    console.warn('Canonical provenance verification: DIFFERENT (warning)');
    result.provenanceDifferences
      .slice(0, 25)
      .forEach(difference => console.warn(`- ${difference}`));
  } else {
    console.log('Canonical provenance verification: MATCH');
  }

  console.log(
    `Canonical schema counts: tables=${result.counts.tables}, columns=${result.counts.columns}, indexes=${result.counts.indexes}, foreignKeys=${result.counts.foreignKeys}, uniqueConstraints=${result.counts.uniqueConstraints}, checks=${result.counts.checkConstraints}`,
  );
};

const main = async (): Promise<void> => {
  const command = process.argv[2];
  if (command === 'migrate') {
    await migrate();
  } else if (command === 'show') {
    await show();
  } else if (command === 'verify') {
    await verify();
  } else {
    throw new Error('Canonical command must be migrate, show, or verify');
  }
};

main().catch(error => {
  const message =
    error instanceof Error &&
    error.message.includes('CANONICAL_BASELINE_REQUIRES_EMPTY_SCHEMA')
      ? 'CANONICAL_BASELINE_REQUIRES_EMPTY_SCHEMA'
      : 'Canonical database command failed';
  console.error(message);
  process.exitCode = 1;
});

export { CANONICAL_MIGRATION_NAME };
