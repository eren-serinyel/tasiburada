export type DatabaseMutationMode = 'seed' | 'reset';

export interface SeedSafetyEnvironment {
  readonly [key: string]: string | undefined;
  readonly NODE_ENV?: string;
  readonly DB_NAME?: string;
  readonly DB_HOST?: string;
  readonly ALLOW_DATABASE_SEED?: string;
  readonly CONFIRM_DATABASE_RESET?: string;
  readonly SEED_DB_HOST_ALLOWLIST?: string;
}

const SYSTEM_DATABASE_NAMES = new Set([
  'mysql',
  'information_schema',
  'performance_schema',
  'sys',
]);

const PRODUCTION_DATABASE_MARKERS = [
  'production',
  'prod',
  'staging',
  'stage',
  'live',
];

const LOCAL_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
]);

function fail(reason: string): never {
  throw new Error(`Unsafe database seed configuration: ${reason}`);
}

function requireNonEmptyString(
  value: string | undefined,
  reason: string,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(reason);
  }

  return value.trim();
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function parseHostAllowlist(value: string | undefined): Set<string> {
  if (!value) {
    return new Set();
  }

  return new Set(
    value
      .split(',')
      .map(normalize)
      .filter(Boolean),
  );
}

export function assertSafeSeedDatabase(
  env: SeedSafetyEnvironment,
  mode: DatabaseMutationMode,
): void {
  const nodeEnv = normalize(
    requireNonEmptyString(env.NODE_ENV, 'NODE_ENV must be development or test'),
  );
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    fail('NODE_ENV must be development or test');
  }

  const databaseName = requireNonEmptyString(
    env.DB_NAME,
    'DB_NAME must be explicitly set',
  );
  const normalizedDatabaseName = normalize(databaseName);

  const databaseHost = normalize(
    requireNonEmptyString(env.DB_HOST, 'DB_HOST must be explicitly set'),
  );

  if (env.ALLOW_DATABASE_SEED !== 'true') {
    fail('ALLOW_DATABASE_SEED must be exactly true');
  }

  if (SYSTEM_DATABASE_NAMES.has(normalizedDatabaseName)) {
    fail('system database names are not allowed');
  }

  if (PRODUCTION_DATABASE_MARKERS.some((marker) => normalizedDatabaseName.includes(marker))) {
    fail('production-like database names are not allowed');
  }

  const allowedHosts = parseHostAllowlist(env.SEED_DB_HOST_ALLOWLIST);
  if (
    !LOCAL_DATABASE_HOSTS.has(databaseHost) &&
    (mode === 'reset' || !allowedHosts.has(databaseHost))
  ) {
    fail('DB_HOST must be local or explicitly allowlisted');
  }

  if (mode === 'reset') {
    const resetConfirmation = requireNonEmptyString(
      env.CONFIRM_DATABASE_RESET,
      'CONFIRM_DATABASE_RESET must exactly match DB_NAME',
    );
    if (resetConfirmation !== databaseName) {
      fail('CONFIRM_DATABASE_RESET must exactly match DB_NAME');
    }
  }
}
