export interface TestDatabaseEnvironment {
  readonly [key: string]: string | undefined;
  readonly NODE_ENV?: string;
  readonly DB_NAME?: string;
  readonly DB_HOST?: string;
  readonly TEST_DB_HOST_ALLOWLIST?: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const UNSAFE_LONG_DATABASE_MARKER = /(production|development|staging|stage|live)/;
const UNSAFE_SHORT_DATABASE_MARKER = /(^|[_-])(prod|dev)(?=$|[_-])/;

const normalize = (value: string): string => value.trim().toLowerCase();

function requireNonEmptyString(
  value: string | undefined,
  reason: string,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Unsafe test database configuration: ${reason}`);
  }

  return value;
}

const fail = (reason: string): never => {
  throw new Error(`Unsafe test database configuration: ${reason}`);
};

export const assertSafeTestDatabase = (env: TestDatabaseEnvironment): void => {
  if (env.NODE_ENV !== 'test') {
    fail('NODE_ENV must be exactly "test"');
  }

  const databaseName = normalize(
    requireNonEmptyString(env.DB_NAME, 'DB_NAME must be explicitly set'),
  );

  if (
    databaseName === 'tasiburada_dev' ||
    UNSAFE_LONG_DATABASE_MARKER.test(databaseName) ||
    UNSAFE_SHORT_DATABASE_MARKER.test(databaseName)
  ) {
    fail('DB_NAME points to a non-test environment');
  }

  if (!databaseName.endsWith('_test')) {
    fail('DB_NAME must end with "_test"');
  }

  const databaseHost = normalize(
    requireNonEmptyString(env.DB_HOST, 'DB_HOST must be explicitly set'),
  );
  if (LOOPBACK_HOSTS.has(databaseHost)) {
    return;
  }

  const allowedHosts = new Set(
    (env.TEST_DB_HOST_ALLOWLIST ?? '')
      .split(',')
      .map(normalize)
      .filter(Boolean),
  );

  if (!allowedHosts.has(databaseHost)) {
    fail('DB_HOST must be loopback or exactly listed in TEST_DB_HOST_ALLOWLIST');
  }
};
