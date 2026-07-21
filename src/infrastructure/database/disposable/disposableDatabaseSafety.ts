export type DisposableDatabaseOperation = 'CREATE' | 'DROP' | 'CONNECT';

export interface DisposableDatabaseEnvironment {
  readonly [key: string]: string | undefined;
  readonly NODE_ENV?: string;
  readonly DB_HOST?: string;
  readonly ALLOW_DISPOSABLE_DB_CREATE?: string;
  readonly ALLOW_DISPOSABLE_DB_DROP?: string;
  readonly CONFIRM_DISPOSABLE_DB_DROP?: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SYSTEM_DATABASES = new Set([
  'mysql',
  'information_schema',
  'performance_schema',
  'sys',
]);
const RESERVED_APPLICATION_DATABASES = new Set([
  'tasiburada',
  'tasiburada_dev',
  'tasiburada_prod',
]);
const SAFE_DATABASE_IDENTIFIER = /^[a-z][a-z0-9_]{0,63}$/;
const UNSAFE_ENVIRONMENT_MARKER = /(production|prod|staging|stage|live)/;

const fail = (reason: string): never => {
  throw new Error(`Disposable database safety check failed: ${reason}`);
};

const requireNonEmpty = (
  value: string | undefined,
  reason: string,
): string => {
  if (typeof value !== 'string' || value === '') {
    fail(reason);
  }
  return value as string;
};

export const assertSafeDisposableDatabaseTarget = (
  env: DisposableDatabaseEnvironment,
  databaseName: string | undefined,
  operation: DisposableDatabaseOperation,
): void => {
  if (env.NODE_ENV !== 'test') {
    fail('NODE_ENV must be exactly "test"');
  }

  const rawDatabaseHost = requireNonEmpty(
    env.DB_HOST,
    'DB_HOST must be explicitly set',
  );
  if (rawDatabaseHost.trim() === '') {
    fail('DB_HOST must be explicitly set');
  }

  const databaseHost = rawDatabaseHost.trim().toLowerCase();
  if (!LOOPBACK_HOSTS.has(databaseHost)) {
    fail('DB_HOST must be a loopback host');
  }

  const targetDatabaseName = requireNonEmpty(
    databaseName,
    'database name must be explicitly set',
  );

  if (!SAFE_DATABASE_IDENTIFIER.test(targetDatabaseName)) {
    fail('database name is not a safe identifier');
  }

  if (
    SYSTEM_DATABASES.has(targetDatabaseName) ||
    RESERVED_APPLICATION_DATABASES.has(targetDatabaseName) ||
    UNSAFE_ENVIRONMENT_MARKER.test(targetDatabaseName)
  ) {
    fail('database name is reserved or contains an unsafe environment marker');
  }

  if (!targetDatabaseName.endsWith('_test')) {
    fail('database name must end with "_test"');
  }

  if (operation === 'CREATE' && env.ALLOW_DISPOSABLE_DB_CREATE !== 'true') {
    fail('CREATE requires ALLOW_DISPOSABLE_DB_CREATE="true"');
  }

  if (operation === 'DROP') {
    if (env.ALLOW_DISPOSABLE_DB_DROP !== 'true') {
      fail('DROP requires ALLOW_DISPOSABLE_DB_DROP="true"');
    }

    if (env.CONFIRM_DISPOSABLE_DB_DROP !== targetDatabaseName) {
      fail('DROP confirmation must exactly match the database name');
    }
  }
};
