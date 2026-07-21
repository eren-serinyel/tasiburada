import {
  assertSafeSeedDatabase,
  DatabaseMutationMode,
  SeedSafetyEnvironment,
} from '../infrastructure/database/seedSafety';

const safeSeedEnvironment: SeedSafetyEnvironment = {
  NODE_ENV: 'development',
  DB_NAME: 'tasiburada_dev',
  DB_HOST: 'localhost',
  ALLOW_DATABASE_SEED: 'true',
};

function expectUnsafe(
  overrides: Partial<SeedSafetyEnvironment>,
  mode: DatabaseMutationMode = 'seed',
): void {
  expect(() => assertSafeSeedDatabase({
    ...safeSeedEnvironment,
    ...overrides,
  }, mode)).toThrow(/^Unsafe database seed configuration: /);
}

describe('assertSafeSeedDatabase', () => {
  test('accepts development localhost with an explicit seed permission', () => {
    expect(() => assertSafeSeedDatabase(safeSeedEnvironment, 'seed')).not.toThrow();
  });

  test('accepts test localhost with an explicit seed permission', () => {
    expect(() => assertSafeSeedDatabase({
      ...safeSeedEnvironment,
      NODE_ENV: 'test',
      DB_NAME: 'tasiburada_test',
    }, 'seed')).not.toThrow();
  });

  test.each(['127.0.0.1', '::1'])('accepts local host %s', (host) => {
    expect(() => assertSafeSeedDatabase({
      ...safeSeedEnvironment,
      DB_HOST: host,
    }, 'seed')).not.toThrow();
  });

  test('accepts an exactly allowlisted and normalized remote host', () => {
    expect(() => assertSafeSeedDatabase({
      ...safeSeedEnvironment,
      DB_HOST: 'CI-DB.EXAMPLE.COM',
      SEED_DB_HOST_ALLOWLIST: 'other.example.com, ci-db.example.com ',
    }, 'seed')).not.toThrow();
  });

  test('accepts reset only with the exact database confirmation', () => {
    expect(() => assertSafeSeedDatabase({
      ...safeSeedEnvironment,
      CONFIRM_DATABASE_RESET: ' tasiburada_dev ',
    }, 'reset')).not.toThrow();
  });

  test.each([
    ['missing', undefined],
    ['production', 'production'],
    ['staging', 'staging'],
    ['another environment', 'qa'],
  ])('rejects %s NODE_ENV', (_label, value) => {
    expectUnsafe({ NODE_ENV: value });
  });

  test('rejects a missing database name', () => {
    expectUnsafe({ DB_NAME: undefined });
  });

  test('rejects a missing database host', () => {
    expectUnsafe({ DB_HOST: undefined });
  });

  test.each([undefined, 'false', '1', 'yes', 'TRUE', ' true '])(
    'rejects non-exact seed permission %p',
    (permission) => {
      expectUnsafe({ ALLOW_DATABASE_SEED: permission });
    },
  );

  test.each(['production', 'prod', 'staging', 'stage', 'live'])(
    'rejects database names containing the %s marker',
    (marker) => {
      expectUnsafe({ DB_NAME: `tasiburada_${marker}_copy` });
    },
  );

  test.each(['mysql', 'information_schema', 'performance_schema', 'sys'])(
    'rejects the %s system database',
    (databaseName) => {
      expectUnsafe({ DB_NAME: databaseName });
    },
  );

  test('rejects a remote host outside the allowlist', () => {
    expectUnsafe({
      DB_HOST: 'db.example.com',
      SEED_DB_HOST_ALLOWLIST: 'ci-db.example.com',
    });
  });

  test('rejects a substring bypass of an allowlisted remote host', () => {
    expectUnsafe({
      DB_HOST: 'ci-db.example.com.evil.test',
      SEED_DB_HOST_ALLOWLIST: 'ci-db.example.com',
    });
  });

  test.each([
    ['missing', undefined],
    ['wrong database', 'another_database'],
    ['empty', ''],
    ['case mismatch', 'TASIBURADA_DEV'],
  ])('rejects %s reset confirmation', (_label, confirmation) => {
    expectUnsafe({ CONFIRM_DATABASE_RESET: confirmation }, 'reset');
  });

  test('does not require reset confirmation for seed-only mode', () => {
    expect(() => assertSafeSeedDatabase({
      ...safeSeedEnvironment,
      CONFIRM_DATABASE_RESET: undefined,
    }, 'seed')).not.toThrow();
  });
});
