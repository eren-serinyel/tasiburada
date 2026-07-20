import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { DataSource, QueryRunner } from 'typeorm';
import {
  CANONICAL_CLEAR_TABLES,
  clearDatabase,
} from '../database/seed/clearDatabase';
import { withSeedDataSource } from '../database/seed/seedDataSource';
import { assertSafeSeedDatabase } from '../infrastructure/database/seedSafety';
import {
  CANONICAL_V1_FINGERPRINT,
} from '../infrastructure/database/canonical/canonicalSeedHarness';
import {
  classifyRuntimeCutoverEnvironment,
  classifyRuntimeCutoverFingerprint,
} from '../infrastructure/database/canonical/runtimeCutoverPreflight';
import type { CanonicalSchemaManifest } from '../infrastructure/database/disposable/schemaManifest';

jest.mock('../database/seed/helpers/pdfHelper', () => ({
  cleanupSeededDocumentFiles: () => 0,
}));

const root = process.cwd();
const source = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');
const manifest = JSON.parse(
  source('docs/database/canonical-v1-schema-manifest.json'),
) as CanonicalSchemaManifest;

const safeResetEnvironment = {
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  DB_NAME: 'tasiburada_m0b2a_unit_test',
  ALLOW_DATABASE_SEED: 'true',
  CONFIRM_DATABASE_RESET: 'tasiburada_m0b2a_unit_test',
};

describe('M0B-2A seed/reset and cutover preparation', () => {
  it('preserves the 46-table V1 inventory inside the additive child-first inventory', () => {
    const expected = manifest.tables
      .map(table => table.name)
      .filter(tableName => tableName !== 'migrations')
      .sort();
    const additiveTables = new Set([
      'shipment_location_conditions',
      'shipment_home_move_details',
      'shipment_home_move_items',
      'shipment_office_move_details',
      'shipment_partial_item_details',
      'shipment_partial_items',
    ]);
    const v1ClearTables = CANONICAL_CLEAR_TABLES
      .filter(tableName => !additiveTables.has(tableName))
      .sort();

    expect(v1ClearTables).toEqual(expected);
    expect(CANONICAL_CLEAR_TABLES).toHaveLength(52);
    expect(CANONICAL_CLEAR_TABLES).toContain(
      'shipment_location_conditions',
    );
    expect(CANONICAL_CLEAR_TABLES).not.toContain('migrations');
    expect(CANONICAL_CLEAR_TABLES).not.toContain('vehicles');
    expect(CANONICAL_CLEAR_TABLES).toEqual(
      expect.arrayContaining([
        'carrier_extra_services',
        'carrier_custom_extra_services',
        'shipment_custom_extra_services',
        'carrier_vehicles',
        'messages',
      ]),
    );

    const positions = new Map<string, number>(
      CANONICAL_CLEAR_TABLES.map((tableName, index) => [tableName, index]),
    );
    for (const table of manifest.tables) {
      if (table.name === 'migrations') continue;
      for (const foreignKey of table.foreignKeys) {
        expect(positions.get(table.name)).toBeLessThan(
          positions.get(foreignKey.referencedTable) as number,
        );
      }
    }
  });

  it('restores FK checks and surfaces a missing-table failure', async () => {
    const statements: string[] = [];
    const queryRunner = {
      connect: jest.fn(async () => undefined),
      query: jest.fn(async (statement: string) => {
        statements.push(statement);
        if (statement.startsWith('TRUNCATE TABLE')) {
          throw new Error('ER_NO_SUCH_TABLE');
        }
        return [];
      }),
      release: jest.fn(async () => undefined),
    } as unknown as QueryRunner;
    const dataSource = {
      createQueryRunner: () => queryRunner,
    } as unknown as DataSource;

    await expect(
      withSeedDataSource(dataSource, () =>
        clearDatabase(safeResetEnvironment),
      ),
    ).rejects.toThrow('ER_NO_SUCH_TABLE');
    expect(statements).toContain('SET FOREIGN_KEY_CHECKS = 1');
    expect(queryRunner.release).toHaveBeenCalledTimes(1);
  });

  it('rejects clear/reset on production-like or remote targets', () => {
    expect(() =>
      assertSafeSeedDatabase(
        {
          ...safeResetEnvironment,
          DB_NAME: 'tasiburada_staging_test',
          CONFIRM_DATABASE_RESET: 'tasiburada_staging_test',
        },
        'reset',
      ),
    ).toThrow('production-like');
    expect(() =>
      assertSafeSeedDatabase(
        {
          ...safeResetEnvironment,
          DB_HOST: 'ci-db.example.com',
          SEED_DB_HOST_ALLOWLIST: 'ci-db.example.com',
        },
        'reset',
      ),
    ).toThrow('DB_HOST must be local');
  });

  it('keeps the canonical seed harness isolated from runtime and legacy migrations', () => {
    const harnessSource = source(
      'src/infrastructure/database/canonical/canonicalSeedHarness.ts',
    );
    const workflowSource = source('src/database/seed/seedWorkflow.ts');
    const seedDataSource = source('src/database/seed/seedDataSource.ts');
    const combined = `${harnessSource}\n${workflowSource}\n${seedDataSource}`;

    expect(combined).not.toMatch(/infrastructure\/database\/data-source/);
    expect(combined).not.toMatch(/database\/migrations|migrations\/\*/);
    expect(harnessSource).toContain('canonicalDatabaseNameFromEnvironment');
    expect(harnessSource).toContain('fingerprintBefore');
    expect(harnessSource).toContain('fingerprintAfter');
    expect(CANONICAL_V1_FINGERPRINT).toBe(
      'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1',
    );

    const seederLogs = [
      'src/database/seed/seeders/adminSeeder.ts',
      'src/database/seed/seeders/carrierSeeder.ts',
      'src/database/seed/seeders/customerSeeder.ts',
    ].map(source).join('\n');
    expect(seederLogs).not.toMatch(
      /console\.(?:log|warn|error)\([^)]*Maviface/i,
    );
  });

  it('blocks invalid preflight environments before connecting', () => {
    const base = {
      NODE_ENV: 'development',
      DB_HOST: 'localhost',
      DB_NAME: 'tasiburada_dev',
      M0B_CUTOVER_PREFLIGHT_DATABASE: 'tasiburada_dev',
    };
    expect(classifyRuntimeCutoverEnvironment(base)).toBeUndefined();
    expect(
      classifyRuntimeCutoverEnvironment({
        ...base,
        DB_HOST: 'db.example.com',
      })?.status,
    ).toBe('BLOCKED_REMOTE_HOST');
    expect(
      classifyRuntimeCutoverEnvironment({
        ...base,
        DB_NAME: 'tasiburada_other',
      })?.status,
    ).toBe('BLOCKED_UNEXPECTED_DATABASE');
    expect(
      classifyRuntimeCutoverEnvironment({
        ...base,
        NODE_ENV: 'test',
      })?.status,
    ).toBe('BLOCKED_ENVIRONMENT');
  });

  it('never reports READY for a non-canonical fingerprint', () => {
    expect(classifyRuntimeCutoverFingerprint(CANONICAL_V1_FINGERPRINT)).toBe(
      'READY_FOR_EXPLICIT_DESTRUCTIVE_APPROVAL',
    );
    expect(classifyRuntimeCutoverFingerprint('different')).toBe(
      'BLOCKED_SCHEMA_MISMATCH',
    );
  });

  it('contains only read-only SQL in the runtime preflight', () => {
    const preflightSource = source(
      'src/infrastructure/database/canonical/runtimeCutoverPreflight.ts',
    );
    expect(preflightSource).not.toMatch(
      /\b(CREATE|ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\b/i,
    );
    expect(preflightSource).toMatch(/\bSELECT\b/);
  });

  it('adds no V2 schema name or baseline drift', () => {
    const changedImplementation = [
      'src/database/seed/clearDatabase.ts',
      'src/database/seed/seedDataSource.ts',
      'src/database/seed/seedWorkflow.ts',
      'src/infrastructure/database/canonical/canonicalSeedHarness.ts',
      'src/infrastructure/database/canonical/m0bSeedSmokeCli.ts',
      'src/infrastructure/database/canonical/runtimeCutoverPreflight.ts',
    ].map(source).join('\n');
    [
      'shipment_rounds',
      'access_purchases',
      'slot_reservations',
      'payment_attempts',
      'credit_ledger_entries',
    ].forEach(name => expect(changedImplementation).not.toContain(name));

    expect(
      source(
        'src/infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1.ts',
      ),
    ).toContain('CanonicalBaselineV11784500000000');
    expect(manifest.schemaFingerprint).toBe(CANONICAL_V1_FINGERPRINT);
  });
});
