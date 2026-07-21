import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { QueryRunner } from 'typeorm';
import {
  SERVICE_CATEGORY_CODES,
  ROUTE_SCOPE_CODES,
  deriveShipmentV2IdentityFromV1,
  isRouteScopeCode,
  isServiceCategoryCode,
  routeScopeCodeFromV1Cities,
  serviceCategoryCodeFromV1ShipmentCategory,
} from '../domain/shipments/ShipmentV2Codes';
import { CanonicalBaselineV11784500000000 } from '../infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../infrastructure/database/canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';
import { CANONICAL_MIGRATIONS } from '../infrastructure/database/canonical/canonicalMigrationRegistry';
import type { CanonicalSchemaManifest } from '../infrastructure/database/disposable/schemaManifest';

const root = process.cwd();
const source = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

const collectStatements = async (
  direction: 'up' | 'down',
): Promise<string[]> => {
  const statements: string[] = [];
  const migration =
    new AddShipmentV2IdentityCodes1784580000000();
  const queryRunner = {
    query: async (statement: string) => {
      statements.push(statement);
      return [];
    },
  } as unknown as QueryRunner;
  await migration[direction](queryRunner);
  return statements;
};

describe('M1A Shipment V2 identity spine', () => {
  it('defines exact independent canonical code sets', () => {
    expect(SERVICE_CATEGORY_CODES).toEqual([
      'HOME_MOVE',
      'OFFICE_MOVE',
      'PARTIAL_ITEM',
    ]);
    expect(ROUTE_SCOPE_CODES).toEqual([
      'INTRACITY',
      'INTERCITY',
    ]);
    [
      'PARTIAL_200',
      'LARGE_SCALE_800',
      'INTERNATIONAL_MOVE',
      'STORAGE_SERVICE',
    ].forEach(code => {
      expect(isServiceCategoryCode(code)).toBe(false);
      expect(isRouteScopeCode(code)).toBe(false);
    });
  });

  it('maps every current V1 category explicitly without a catch-all', () => {
    expect(
      serviceCategoryCodeFromV1ShipmentCategory('HOME_MOVE'),
    ).toBe('HOME_MOVE');
    expect(
      serviceCategoryCodeFromV1ShipmentCategory('OFFICE_MOVE'),
    ).toBe('OFFICE_MOVE');
    expect(
      serviceCategoryCodeFromV1ShipmentCategory('PARTIAL_ITEM'),
    ).toBe('PARTIAL_ITEM');
    expect(
      serviceCategoryCodeFromV1ShipmentCategory('STORAGE'),
    ).toBeNull();
    expect(
      serviceCategoryCodeFromV1ShipmentCategory('UNKNOWN'),
    ).toBeNull();
    expect(
      serviceCategoryCodeFromV1ShipmentCategory(null),
    ).toBeNull();
  });

  it('derives route scope independently from normalized V1 cities', () => {
    expect(
      routeScopeCodeFromV1Cities('İstanbul', 'istanbul'),
    ).toBe('INTRACITY');
    expect(
      routeScopeCodeFromV1Cities('İstanbul', 'Ankara'),
    ).toBe('INTERCITY');
    expect(
      routeScopeCodeFromV1Cities('', 'Ankara'),
    ).toBeNull();

    expect(
      deriveShipmentV2IdentityFromV1({
        shipmentCategory: 'HOME_MOVE',
        originCity: 'İstanbul',
        destinationCity: 'Ankara',
      }),
    ).toEqual({
      serviceCategoryCode: 'HOME_MOVE',
      routeScopeCode: 'INTERCITY',
    });
    expect(
      deriveShipmentV2IdentityFromV1({
        shipmentCategory: 'PARTIAL_ITEM',
        originCity: 'Ankara',
        destinationCity: 'Ankara',
      }),
    ).toEqual({
      serviceCategoryCode: 'PARTIAL_ITEM',
      routeScopeCode: 'INTRACITY',
    });
  });

  it('adds nullable ASCII identity columns, checks and indexes', async () => {
    const sql = (await collectStatements('up')).join('\n');
    expect(sql).toMatch(
      /service_category_code`\s+VARCHAR\(32\) CHARACTER SET ascii COLLATE ascii_bin NULL/i,
    );
    expect(sql).toMatch(
      /route_scope_code`\s+VARCHAR\(32\) CHARACTER SET ascii COLLATE ascii_bin NULL/i,
    );
    expect(sql).not.toMatch(
      /(service_category_code|route_scope_code)[\s\S]*DEFAULT/i,
    );
    expect(sql).toContain(
      'CHK_shipments_service_category_code',
    );
    expect(sql).toContain(
      'CHK_shipments_route_scope_code',
    );
    SERVICE_CATEGORY_CODES.forEach(code =>
      expect(sql).toContain(`'${code}'`),
    );
    ROUTE_SCOPE_CODES.forEach(code =>
      expect(sql).toContain(`'${code}'`),
    );
    expect(sql).toContain(
      'IDX_shipments_service_category_code',
    );
    expect(sql).toContain('IDX_shipments_route_scope_code');
    expect(sql).toMatch(
      /UQ_shipments_id_service_category_code[\s\S]*`id`, `service_category_code`/,
    );
  });

  it('backfills only proven V1 mappings and adds no future schema', async () => {
    const sql = (await collectStatements('up')).join('\n');
    expect(sql).toContain(
      "WHEN 'HOME_MOVE' THEN 'HOME_MOVE'",
    );
    expect(sql).toContain(
      "WHEN 'OFFICE_MOVE' THEN 'OFFICE_MOVE'",
    );
    expect(sql).toContain(
      "WHEN 'PARTIAL_ITEM' THEN 'PARTIAL_ITEM'",
    );
    expect(sql).toContain("WHEN 'STORAGE' THEN NULL");
    expect(sql).toContain('ELSE NULL');
    expect(sql).not.toMatch(/\bDROP\b|\bRENAME\b/i);
    [
      'shipment_rounds',
      'category_details',
      'access_purchases',
      'slot_reservations',
      'payment_attempts',
      'credit_ledger_entries',
    ].forEach(name => expect(sql).not.toContain(name));
  });

  it('keeps down limited to reverse-order M1A objects', async () => {
    const statements = await collectStatements('down');
    const sql = statements.join('\n');
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toContain('CanonicalBaseline');
    expect(sql).not.toMatch(
      /DROP COLUMN `shipment_category`|RENAME/i,
    );
    expect(
      sql.indexOf('DROP CHECK'),
    ).toBeLessThan(
      sql.indexOf('DROP COLUMN `route_scope_code`'),
    );
    expect(
      sql.indexOf('DROP COLUMN `route_scope_code`'),
    ).toBeLessThan(
      sql.indexOf('DROP COLUMN `service_category_code`'),
    );
  });

  it('registers baseline then M1A without a legacy glob', () => {
    expect(CANONICAL_MIGRATIONS.slice(0, 2)).toEqual([
      CanonicalBaselineV11784500000000,
      AddShipmentV2IdentityCodes1784580000000,
    ]);
    const runtimeSource = source(
      'src/infrastructure/database/data-source.ts',
    );
    expect(runtimeSource).toContain('CANONICAL_MIGRATIONS');
    expect(runtimeSource).not.toMatch(
      /database\/migrations|migrationPatterns|migrations\/\*/,
    );
  });

  it('keeps entity fields internal and public DTOs unchanged', () => {
    const entitySource = source(
      'src/domain/entities/Shipment.ts',
    );
    expect(entitySource).toMatch(
      /serviceCategoryCode: ServiceCategoryCode \| null/,
    );
    expect(entitySource).toMatch(
      /routeScopeCode: RouteScopeCode \| null/,
    );
    for (const option of [
      'nullable: true',
      'select: false',
      'insert: false',
      'update: false',
    ]) {
      expect(entitySource).toContain(option);
    }
    const dtoSource = source(
      'src/application/dto/ShipmentDto.ts',
    );
    expect(dtoSource).not.toContain('serviceCategoryCode');
    expect(dtoSource).not.toContain('routeScopeCode');
  });

  it('uses the single independent mapping helper in seed', () => {
    const seedSource = source(
      'src/database/seed/seeders/shipmentSeeder.ts',
    );
    expect(seedSource).toContain(
      'deriveShipmentV2IdentityFromV1',
    );
    expect(seedSource).not.toContain('PARTIAL_200');
    expect(seedSource).not.toContain('LARGE_SCALE_800');
    expect(seedSource).not.toContain('ShipmentRound');
  });

  it('isolates seeded-upgrade document fixtures from application files', () => {
    const smokeSource = source(
      'src/infrastructure/database/canonical/m1aSmokeCli.ts',
    );
    const fixtureSafetySource = source(
      'src/infrastructure/database/canonical/disposableFixtureSafety.ts',
    );
    expect(fixtureSafetySource).toContain(
      'tasiburada-m1a-seed-documents-',
    );
    expect(smokeSource).toContain('SEED_DOCUMENTS_DIR');
    expect(smokeSource).toContain(
      'createDisposableFixtureDirectory',
    );
    expect(smokeSource).toContain(
      'cleanupDisposableFixtureDirectory',
    );
    expect(smokeSource).not.toContain(
      'cleanupSeededDocumentFiles',
    );
    expect(fixtureSafetySource).not.toContain('rmSync');
    expect(fixtureSafetySource).not.toMatch(
      /recursive\s*:\s*true/,
    );
    expect(smokeSource).toContain(
      'Removed isolated seed document fixtures',
    );
  });

  it('preserves the canonical V1 baseline and stored manifest', () => {
    const baseline = source(
      'src/infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1.ts',
    );
    const manifest = JSON.parse(
      source('docs/database/canonical-v1-schema-manifest.json'),
    ) as CanonicalSchemaManifest;
    expect(baseline).not.toContain('service_category_code');
    expect(baseline).not.toContain('route_scope_code');
    expect(manifest.schemaFingerprint).toBe(
      'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1',
    );
  });
});
