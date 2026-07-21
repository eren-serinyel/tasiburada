import {
  assertSafeTestDatabase,
  type TestDatabaseEnvironment,
} from '../infrastructure/database/databaseSafety';

const safeEnvironment = (
  overrides: Partial<TestDatabaseEnvironment> = {},
): TestDatabaseEnvironment => ({
  NODE_ENV: 'test',
  DB_NAME: 'tasiburada_test',
  DB_HOST: 'localhost',
  ...overrides,
});

describe('assertSafeTestDatabase', () => {
  it.each(['localhost', '127.0.0.1', '::1'])(
    'accepts loopback host %s',
    DB_HOST => {
      expect(() => assertSafeTestDatabase(safeEnvironment({ DB_HOST }))).not.toThrow();
    },
  );

  it('normalizes database name and host case and whitespace', () => {
    expect(() => assertSafeTestDatabase(safeEnvironment({
      DB_NAME: '  TaSiBuRaDaN_TEST  ',
      DB_HOST: '  LOCALHOST  ',
    }))).not.toThrow();
  });

  it('accepts a remote CI host only when it is explicitly allowlisted', () => {
    expect(() => assertSafeTestDatabase(safeEnvironment({
      DB_HOST: ' CI-DB.INTERNAL ',
      TEST_DB_HOST_ALLOWLIST: 'mysql.internal, ci-db.internal',
    }))).not.toThrow();
  });

  it.each([
    'tasiburada_test',
    'feature42_test',
    'device_test',
  ])('accepts safe database name %s', DB_NAME => {
    expect(() => assertSafeTestDatabase(safeEnvironment({ DB_NAME }))).not.toThrow();
  });

  it.each([
    ['missing NODE_ENV', { NODE_ENV: undefined }],
    ['development environment', { NODE_ENV: 'development' }],
    ['production environment', { NODE_ENV: 'production' }],
    ['case-changed NODE_ENV', { NODE_ENV: 'TEST' }],
    ['whitespace-padded NODE_ENV', { NODE_ENV: ' test ' }],
    ['missing DB_NAME', { DB_NAME: undefined }],
    ['blank DB_NAME', { DB_NAME: '   ' }],
    ['development fallback database', { DB_NAME: 'tasiburada_dev' }],
    ['database without _test suffix', { DB_NAME: 'tasiburada' }],
    ['embedded development marker', { DB_NAME: 'mydevelopment_test' }],
    ['production marker', { DB_NAME: 'tasiburada_production_test' }],
    ['hyphenated staging marker', { DB_NAME: 'tasiburada-staging_test' }],
    ['embedded live marker', { DB_NAME: 'livecopy_test' }],
    ['bounded prod marker', { DB_NAME: 'prod_shadow_test' }],
    ['hyphen-bounded dev marker', { DB_NAME: 'tasiburada-dev-test' }],
    ['underscore-bounded dev marker', { DB_NAME: 'tasiburada_dev_test' }],
    ['missing DB_HOST', { DB_HOST: undefined }],
    ['blank DB_HOST', { DB_HOST: '   ' }],
    ['non-allowlisted remote host', { DB_HOST: 'db.internal' }],
    ['allowlist substring trick', {
      DB_HOST: 'ci-db.internal.evil',
      TEST_DB_HOST_ALLOWLIST: 'ci-db.internal',
    }],
  ] as Array<[string, Partial<TestDatabaseEnvironment>]>)(
    'rejects %s',
    (_label, overrides) => {
      expect(() => assertSafeTestDatabase(safeEnvironment(overrides))).toThrow(
        'Unsafe test database configuration',
      );
    },
  );
});
