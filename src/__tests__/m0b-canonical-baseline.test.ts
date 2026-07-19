import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { DataSourceOptions, QueryRunner } from 'typeorm';
import {
  CANONICAL_APPLICATION_TABLES,
  CanonicalBaselineV11784500000000,
} from '../infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1';
import {
  CANONICAL_MIGRATION_DIRECTORY,
  CANONICAL_MIGRATION_NAME,
  canonicalDataSourceOptions,
} from '../infrastructure/database/canonical/canonicalDataSource';
import type { CanonicalSchemaManifest } from '../infrastructure/database/disposable/schemaManifest';

const migrationPath = resolve(
  __dirname,
  '../infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1.ts',
);
const dataSourcePath = resolve(
  __dirname,
  '../infrastructure/database/canonical/canonicalDataSource.ts',
);

const safeEnvironment = {
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USERNAME: 'root',
  DB_PASSWORD: '',
  CANONICAL_DB_NAME: 'tasiburada_m0b_unit_test',
};

const queryRunnerWith = (
  query: (statement: string) => Promise<unknown>,
): QueryRunner => ({ query } as unknown as QueryRunner);

describe('M0B canonical baseline', () => {
  it('configures an isolated UTC canonical DataSource', () => {
    const options = canonicalDataSourceOptions(safeEnvironment);

    expect(CANONICAL_MIGRATION_DIRECTORY).toBe(
      'src/infrastructure/database/canonical-migrations',
    );
    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBe(false);
    expect(options.logging).toBe(false);
    expect((options as DataSourceOptions & { timezone?: string }).timezone).toBe(
      '+00:00',
    );
    expect(options.migrations).toEqual([
      CanonicalBaselineV11784500000000,
    ]);
    expect(options.migrationsTableName).toBe('migrations');
  });

  it('does not import runtime DataSource or a legacy migration glob', () => {
    const source = readFileSync(dataSourcePath, 'utf8');

    expect(source).not.toMatch(/from ['"].*\/data-source['"]/);
    expect(source).not.toMatch(/database\/migrations|\bmigrations\/\*|legacy/i);
    expect(source).toContain('canonical-migrations');
  });

  it('requires explicit CANONICAL_DB_NAME and ignores a safe DB_NAME fallback', () => {
    expect(() =>
      canonicalDataSourceOptions({
        ...safeEnvironment,
        CANONICAL_DB_NAME: undefined,
        DB_NAME: 'tasiburada_other_test',
      }),
    ).toThrow('database name must be explicitly set');
  });

  it('contains exactly the 46 manifest application tables', async () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          'docs/database/canonical-v1-schema-manifest.json',
        ),
        'utf8',
      ),
    ) as CanonicalSchemaManifest;
    const expected = manifest.tables
      .map(table => table.name)
      .filter(tableName => tableName !== 'migrations')
      .sort();
    const statements: string[] = [];
    const migration = new CanonicalBaselineV11784500000000();

    await migration.up(
      queryRunnerWith(async statement => {
        if (statement.includes('information_schema.TABLES')) {
          return [{ tableName: 'migrations' }];
        }
        statements.push(statement);
        return [];
      }),
    );
    const actual = statements
      .map(statement => /CREATE TABLE `([^`]+)`/.exec(statement)?.[1])
      .filter((tableName): tableName is string => Boolean(tableName))
      .sort();

    expect(CANONICAL_APPLICATION_TABLES).toHaveLength(46);
    expect(statements).toHaveLength(46);
    expect(actual).toEqual(expected);
    expect(actual).not.toContain('migrations');
  });

  it('rejects a non-empty schema before the first DDL statement', async () => {
    const statements: string[] = [];
    const migration = new CanonicalBaselineV11784500000000();

    await expect(
      migration.up(
        queryRunnerWith(async statement => {
          statements.push(statement);
          return [{ tableName: 'm0b_non_empty_sentinel' }];
        }),
      ),
    ).rejects.toThrow('CANONICAL_BASELINE_REQUIRES_EMPTY_SCHEMA');
    expect(statements).toHaveLength(1);
    expect(statements[0]).toContain('information_schema.TABLES');
  });

  it('has an irreversible and non-destructive down operation', async () => {
    const migration = new CanonicalBaselineV11784500000000();

    await expect(
      migration.down(queryRunnerWith(async () => [])),
    ).rejects.toThrow(
      'CANONICAL_BASELINE_IS_IRREVERSIBLE_USE_DISPOSABLE_DATABASE_RESET',
    );
  });

  it('contains no data insert, drift-hiding DDL, destructive down, or row-derived option', () => {
    const source = readFileSync(migrationPath, 'utf8');

    expect(source).not.toMatch(/\bINSERT\b/i);
    expect(source).not.toMatch(/CREATE TABLE IF NOT EXISTS/i);
    expect(source).not.toMatch(/\bDROP TABLE\b/i);
    expect(source).not.toMatch(/AUTO_INCREMENT=\d+/i);
    expect(source).not.toMatch(/CREATE TABLE \\`migrations\\`/i);
  });

  it('contains no V2 table names or unsafe machine/credential values', () => {
    const source = readFileSync(migrationPath, 'utf8');
    const forbiddenV2Tables = [
      'shipment_rounds',
      'access_purchases',
      'slot_reservations',
      'payment_attempts',
      'credit_ledger_entries',
      'media_asset_variants',
      'shipment_home_move_details',
    ];

    forbiddenV2Tables.forEach(tableName =>
      expect(source).not.toContain(tableName),
    );
    expect(source).not.toMatch(/[A-Za-z]:\\Users\\/);
    expect(source).not.toMatch(/mysql:\/\/|connectionString\s*=|DB_PASSWORD\s*=/);
    expect(CANONICAL_MIGRATION_NAME).toBe(
      'CanonicalBaselineV11784500000000',
    );
  });
});
