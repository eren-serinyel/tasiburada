import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  assertSafeDisposableDatabaseTarget,
  type DisposableDatabaseEnvironment,
  type DisposableDatabaseOperation,
} from '../infrastructure/database/disposable/disposableDatabaseSafety';

const safeEnvironment = (
  overrides: Partial<DisposableDatabaseEnvironment> = {},
): DisposableDatabaseEnvironment => ({
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  ALLOW_DISPOSABLE_DB_CREATE: 'true',
  ALLOW_DISPOSABLE_DB_DROP: 'true',
  CONFIRM_DISPOSABLE_DB_DROP: 'tasiburada_m0_abc_test',
  ...overrides,
});

const assertTarget = (
  overrides: Partial<DisposableDatabaseEnvironment> = {},
  databaseName = 'tasiburada_m0_abc_test',
  operation: DisposableDatabaseOperation = 'CONNECT',
): void =>
  assertSafeDisposableDatabaseTarget(
    safeEnvironment(overrides),
    databaseName,
    operation,
  );

describe('assertSafeDisposableDatabaseTarget', () => {
  it.each(['localhost', '127.0.0.1', '::1'])(
    'accepts safe targets on loopback host %s',
    DB_HOST => {
      expect(() => assertTarget({ DB_HOST })).not.toThrow();
    },
  );

  it('accepts the recommended database name format', () => {
    expect(() => assertTarget()).not.toThrow();
  });

  it.each([
    ['development NODE_ENV', { NODE_ENV: 'development' }, undefined],
    ['missing host', { DB_HOST: undefined }, undefined],
    ['remote host', { DB_HOST: 'db.internal' }, undefined],
    ['missing database name', {}, undefined],
    ['missing _test suffix', {}, 'tasiburada_m0_abc'],
    ['legacy development name', {}, 'tasiburada_dev'],
    ['invalid identifier', {}, 'tasiburada.m0.abc_test'],
    ['suffix in the middle', {}, 'tasiburada_test_abc'],
  ] as Array<
    [
      string,
      Partial<DisposableDatabaseEnvironment>,
      string | undefined,
    ]
  >)('rejects %s', (_label, overrides, target) => {
    expect(() =>
      assertSafeDisposableDatabaseTarget(
        safeEnvironment(overrides),
        target,
        'CONNECT',
      ),
    ).toThrow('Disposable database safety check failed:');
  });

  it.each([
    'tasiburada_production_copy_test',
    'tasiburada_prod_copy_test',
    'tasiburada_staging_copy_test',
    'tasiburada_stage_copy_test',
    'tasiburada_live_copy_test',
  ])('rejects unsafe environment marker in %s', target => {
    expect(() => assertTarget({}, target)).toThrow(
      'Disposable database safety check failed:',
    );
  });

  it.each(['mysql', 'information_schema', 'performance_schema', 'sys'])(
    'rejects MySQL system database %s',
    target => {
      expect(() => assertTarget({}, target)).toThrow(
        'Disposable database safety check failed:',
      );
    },
  );

  it('requires explicit CREATE permission', () => {
    expect(() =>
      assertTarget({ ALLOW_DISPOSABLE_DB_CREATE: undefined }, undefined, 'CREATE'),
    ).toThrow('CREATE requires');
  });

  it('requires explicit DROP permission', () => {
    expect(() =>
      assertTarget({ ALLOW_DISPOSABLE_DB_DROP: undefined }, undefined, 'DROP'),
    ).toThrow('DROP requires');
  });

  it('requires exact DROP confirmation', () => {
    expect(() =>
      assertTarget({ CONFIRM_DISPOSABLE_DB_DROP: undefined }, undefined, 'DROP'),
    ).toThrow('confirmation must exactly match');
  });

  it('rejects case-mismatched DROP confirmation', () => {
    expect(() =>
      assertTarget(
        { CONFIRM_DISPOSABLE_DB_DROP: 'TASIBURADA_M0_ABC_TEST' },
        undefined,
        'DROP',
      ),
    ).toThrow('confirmation must exactly match');
  });

  it('does not import a DataSource or database driver', () => {
    const source = readFileSync(
      resolve(
        __dirname,
        '../infrastructure/database/disposable/disposableDatabaseSafety.ts',
      ),
      'utf8',
    );
    expect(source).not.toMatch(/typeorm|mysql2|data-source|DataSource/);
  });
});
