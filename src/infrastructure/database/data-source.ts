import 'reflect-metadata';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { assertSafeTestDatabase } from './databaseSafety';
import { CANONICAL_MIGRATIONS } from './canonical/canonicalMigrationRegistry';

config();

if (process.env.NODE_ENV === 'test') {
  assertSafeTestDatabase(process.env);
}

const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_NAME,
  DB_POOL,
  NODE_ENV,
  TS_NODE,
  TS_NODE_DEV,
} = process.env;

const port = Number(DB_PORT ?? 3306) || 3306;
const poolSize = Number(DB_POOL ?? 10) || 10;
const isDev = (NODE_ENV ?? 'development') === 'development';
const usingTsRuntime = Boolean(
  TS_NODE_DEV ||
  TS_NODE === 'true' ||
  process.argv.some(argument => argument.includes('ts-node')) ||
  /\.ts$/.test(__filename)
);
const entityPatterns = usingTsRuntime
  ? ['src/domain/entities/**/*.ts']
  : ['dist/domain/entities/**/*.js'];

export const RUNTIME_SESSION_TIMEZONE_SQL =
  `SET SESSION time_zone = '+00:00'`;

interface RuntimeMysqlConnection {
  query(
    statement: string,
    callback: (error?: Error | null) => void,
  ): void;
}

interface RuntimeMysqlPool {
  on(
    event: 'connection',
    listener: (connection: RuntimeMysqlConnection) => void,
  ): void;
}

class RuntimeDataSource extends DataSource {
  private utcConnectionListenerInstalled = false;

  private installUtcConnectionListener(): void {
    if (this.utcConnectionListenerInstalled) return;
    const driver = this.driver as unknown as {
      pool?: RuntimeMysqlPool;
    };
    if (!driver.pool) {
      throw new Error('Runtime database UTC setup failed: pool unavailable');
    }

    driver.pool.on('connection', connection => {
      connection.query(RUNTIME_SESSION_TIMEZONE_SQL, error => {
        if (error) {
          console.error('Runtime database UTC session setup failed');
        }
      });
    });
    this.utcConnectionListenerInstalled = true;
  }

  override async initialize(): Promise<this> {
    await super.initialize();
    this.installUtcConnectionListener();
    await this.query(RUNTIME_SESSION_TIMEZONE_SQL);
    const rows = (await this.query(
      'SELECT @@session.time_zone AS sessionTimezone',
    )) as Array<{ readonly sessionTimezone: string }>;
    if (String(rows[0]?.sessionTimezone) !== '+00:00') {
      await super.destroy();
      this.utcConnectionListenerInstalled = false;
      throw new Error('Runtime database UTC session verification failed');
    }
    return this;
  }

  override async destroy(): Promise<void> {
    await super.destroy();
    this.utcConnectionListenerInstalled = false;
  }
}

const runtimeDataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: DB_HOST ?? 'localhost',
  port,
  username: DB_USERNAME ?? 'root',
  password: DB_PASSWORD ?? '',
  database: DB_NAME ?? 'tasiburada_dev',
  synchronize: false,
  migrationsRun: false,
  logging: isDev,
  entities: entityPatterns,
  migrations: [...CANONICAL_MIGRATIONS],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'none',
  charset: 'utf8mb4',
  timezone: '+00:00',
  extra: {
    connectionLimit: poolSize,
    charset: 'utf8mb4_unicode_ci',
  },
};

export const AppDataSource = new RuntimeDataSource(
  runtimeDataSourceOptions,
);

export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connection initialized');
  } catch (error: unknown) {
    console.error('❌ DB connection failed');
    if (error instanceof Error) {
      console.error(error.message);
      if (isDev && error.stack) console.error(error.stack);
    }
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  } catch (error: unknown) {
    console.error('❌ DB close failed');
    if (error instanceof Error) {
      console.error(error.message);
      if (isDev && error.stack) console.error(error.stack);
    }
    throw error;
  }
};
