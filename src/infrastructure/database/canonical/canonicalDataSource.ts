import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { CanonicalBaselineV11784500000000 } from '../canonical-migrations/1784500000000-CanonicalBaselineV1';
import {
  assertSafeDisposableDatabaseTarget,
  type DisposableDatabaseEnvironment,
} from '../disposable/disposableDatabaseSafety';

export const CANONICAL_MIGRATION_DIRECTORY =
  'src/infrastructure/database/canonical-migrations';
export const CANONICAL_MIGRATION_NAME =
  'CanonicalBaselineV11784500000000';

const portFromEnvironment = (
  env: DisposableDatabaseEnvironment,
): number => {
  const port = Number(env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Canonical database configuration failed: invalid port');
  }
  return port;
};

export const canonicalDatabaseNameFromEnvironment = (
  env: DisposableDatabaseEnvironment,
): string => {
  const databaseName = env.CANONICAL_DB_NAME;
  assertSafeDisposableDatabaseTarget(env, databaseName, 'CONNECT');
  return databaseName as string;
};

export const canonicalDataSourceOptions = (
  env: DisposableDatabaseEnvironment,
): DataSourceOptions => {
  const database = canonicalDatabaseNameFromEnvironment(env);

  return {
    type: 'mysql',
    host: env.DB_HOST,
    port: portFromEnvironment(env),
    username: env.DB_USERNAME ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database,
    charset: 'utf8mb4',
    timezone: '+00:00',
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [],
    migrations: [CanonicalBaselineV11784500000000],
    migrationsTableName: 'migrations',
    migrationsTransactionMode: 'none',
    extra: {
      connectionLimit: 1,
      charset: 'utf8mb4_unicode_ci',
    },
  };
};

export const createCanonicalDataSource = (
  env: DisposableDatabaseEnvironment = process.env,
): DataSource => new DataSource(canonicalDataSourceOptions(env));

export const initializeCanonicalDataSource = async (
  env: DisposableDatabaseEnvironment = process.env,
): Promise<DataSource> => {
  const dataSource = createCanonicalDataSource(env);
  await dataSource.initialize();
  await dataSource.query(`SET SESSION time_zone = '+00:00'`);
  return dataSource;
};
