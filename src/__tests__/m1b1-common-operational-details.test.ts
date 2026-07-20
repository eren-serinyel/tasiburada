import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { QueryRunner } from 'typeorm';
import {
  DATE_FLEXIBILITY_CODES,
  ELEVATOR_TYPE_CODES,
  LOCATION_SIDE_CODES,
  VEHICLE_ACCESS_DISTANCE_CODES,
  deriveDateWindow,
  isDateFlexibilityCode,
  isElevatorTypeCode,
  isLocationSideCode,
  isSafeRestrictionNote,
  isValidDateFlexibilityWindow,
  isVehicleAccessDistanceCode,
} from '../domain/shipments/ShipmentOperationalCodes';
import { CanonicalBaselineV11784500000000 } from '../infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../infrastructure/database/canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';
import { AddShipmentOperationalConditions1784660000000 } from '../infrastructure/database/canonical-migrations/1784660000000-AddShipmentOperationalConditions';
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
    new AddShipmentOperationalConditions1784660000000();
  const queryRunner = {
    query: async (statement: string) => {
      statements.push(statement);
      return [];
    },
  } as unknown as QueryRunner;
  await migration[direction](queryRunner);
  return statements;
};

describe('M1B-1 common operational details', () => {
  it('defines the exact independent canonical code sets', () => {
    expect(DATE_FLEXIBILITY_CODES).toEqual([
      'EXACT_DATE',
      'PLUS_MINUS_1_DAY',
      'PLUS_MINUS_3_DAYS',
      'ANY_DAY_IN_SELECTED_WEEK',
      'UNDECIDED',
    ]);
    expect(LOCATION_SIDE_CODES).toEqual([
      'ORIGIN',
      'DESTINATION',
    ]);
    expect(ELEVATOR_TYPE_CODES).toEqual([
      'NONE',
      'STANDARD',
      'FREIGHT',
      'NOT_SUITABLE',
      'UNKNOWN',
    ]);
    expect(VEHICLE_ACCESS_DISTANCE_CODES).toEqual([
      'AT_ENTRANCE',
      'BETWEEN_20_AND_50_METERS',
      'OVER_50_METERS',
      'UNKNOWN',
    ]);
    expect(isDateFlexibilityCode('EXACT_DATE')).toBe(true);
    expect(isLocationSideCode('ORIGIN')).toBe(true);
    expect(isElevatorTypeCode('FREIGHT')).toBe(true);
    expect(
      isVehicleAccessDistanceCode('OVER_50_METERS'),
    ).toBe(true);
    [
      'HOME_MOVE',
      'INTRACITY',
      'PARTIAL_200',
      'LARGE_SCALE_800',
    ].forEach(code => {
      expect(isDateFlexibilityCode(code)).toBe(false);
      expect(isLocationSideCode(code)).toBe(false);
      expect(isElevatorTypeCode(code)).toBe(false);
      expect(isVehicleAccessDistanceCode(code)).toBe(false);
    });
  });

  it('derives real deterministic date windows', () => {
    expect(
      deriveDateWindow('2026-08-20', 'EXACT_DATE'),
    ).toEqual({
      start: '2026-08-20',
      end: '2026-08-20',
    });
    expect(
      deriveDateWindow('2026-08-20', 'PLUS_MINUS_1_DAY'),
    ).toEqual({
      start: '2026-08-19',
      end: '2026-08-21',
    });
    expect(
      deriveDateWindow('2026-08-20', 'PLUS_MINUS_3_DAYS'),
    ).toEqual({
      start: '2026-08-17',
      end: '2026-08-23',
    });
    expect(
      deriveDateWindow(
        '2026-08-20',
        'ANY_DAY_IN_SELECTED_WEEK',
      ),
    ).toEqual({
      start: '2026-08-17',
      end: '2026-08-23',
    });
    expect(
      deriveDateWindow('2026-08-20', 'UNDECIDED'),
    ).toEqual({ start: null, end: null });
    expect(
      isValidDateFlexibilityWindow(
        '2026-08-20',
        'PLUS_MINUS_3_DAYS',
        '2026-08-17',
        '2026-08-23',
      ),
    ).toBe(true);
  });

  it('rejects contact and open-address content in restriction notes', () => {
    expect(
      isSafeRestrictionNote(
        'Operasyon saati önceden teyit edilmeli.',
      ),
    ).toBe(true);
    expect(isSafeRestrictionNote('0555 111 22 33')).toBe(false);
    expect(isSafeRestrictionNote('test@example.com')).toBe(false);
    expect(isSafeRestrictionNote('https://example.com')).toBe(false);
    expect(
      isSafeRestrictionNote('<script>alert(1)</script>'),
    ).toBe(false);
    expect(
      isSafeRestrictionNote('Örnek Mah. No: 12'),
    ).toBe(false);
  });

  it('adds only nullable defaultless canonical date fields', async () => {
    const sql = (await collectStatements('up')).join('\n');
    expect(sql).not.toContain('preferred_move_date');
    expect(sql).toMatch(
      /date_flexibility_code`\s+VARCHAR\(32\) CHARACTER SET ascii COLLATE ascii_bin NULL/i,
    );
    expect(sql).toMatch(/date_window_start` DATE NULL/i);
    expect(sql).toMatch(/date_window_end` DATE NULL/i);
    expect(sql).not.toMatch(
      /date_(?:flexibility_code|window_start|window_end)[\s\S]{0,80}DEFAULT/i,
    );
    DATE_FLEXIBILITY_CODES.forEach(code =>
      expect(sql).toContain(`'${code}'`),
    );
    expect(sql).toContain('CHK_shipments_date_window_pair');
    expect(sql).toContain('CHK_shipments_date_window_order');
    expect(sql).toContain(
      'CHK_shipments_date_flexibility_semantics',
    );
  });

  it('creates the location table with exact ownership constraints', async () => {
    const sql = (await collectStatements('up')).join('\n');
    expect(sql).toContain(
      'CREATE TABLE `shipment_location_conditions`',
    );
    expect(sql).toMatch(
      /UNIQUE KEY\s+`UQ_shipment_location_conditions_shipment_side`\s+\(`shipment_id`, `side_code`\)/,
    );
    expect(sql).toContain(
      'IDX_shipment_location_conditions_shipment_id',
    );
    expect(sql).toMatch(
      /FOREIGN KEY \(`shipment_id`\) REFERENCES `shipments` \(`id`\)\s+ON DELETE CASCADE ON UPDATE RESTRICT/,
    );
    expect(sql).toMatch(
      /side_code` IN \('ORIGIN', 'DESTINATION'\)/,
    );
    expect(sql).toMatch(
      /floor_number` BETWEEN -10 AND 200/,
    );
    expect(sql).not.toMatch(
      /KEY `[^`]*side[^`]*` \(`side_code`\)/,
    );
  });

  it('backfills only lossless V1 fields without fake access defaults', async () => {
    const statements = await collectStatements('up');
    const backfill = statements
      .filter(statement =>
        statement.startsWith('INSERT INTO') ||
        statement.startsWith('UPDATE `shipments`'),
      )
      .join('\n');
    expect(backfill).toContain('`origin_floor`');
    expect(backfill).toContain('`destination_floor`');
    expect(backfill).toContain(
      "WHEN 'EXACT' THEN 'EXACT_DATE'",
    );
    expect(backfill).toContain('ELSE NULL');
    expect(backfill).not.toContain(
      '`elevator_type_code`,',
    );
    expect(backfill).not.toContain(
      '`vehicle_access_distance_code`,',
    );
    expect(backfill).not.toContain("'AT_ENTRANCE'");
    expect(backfill).not.toMatch(
      /has_(?:narrow_street|site_entry_restriction|time_restriction)`\s*,/,
    );
  });

  it('adds no category-specific or future workflow schema', async () => {
    const sql = (await collectStatements('up')).join('\n');
    [
      'shipment_rounds',
      'shipment_snapshots',
      'home_move_details',
      'office_move_details',
      'partial_item_details',
      'access_purchases',
      'pricing',
      'slot_reservations',
      'payment_attempts',
      'shipment_media',
    ].forEach(name => expect(sql).not.toContain(name));
    expect(sql).not.toMatch(
      /DROP COLUMN `(?:shipment_date|origin_|destination_)|RENAME/i,
    );
  });

  it('clears location conditions before their shipment parent', () => {
    const clearSource = source(
      'src/database/seed/clearDatabase.ts',
    );
    expect(
      clearSource.indexOf("'shipment_location_conditions'"),
    ).toBeLessThan(clearSource.indexOf("'shipments'"));
  });

  it('seeds common conditions independently with varied safe values', () => {
    const seed = source(
      'src/database/seed/seeders/shipmentSeeder.ts',
    );
    expect(seed).toContain(
      'persistSeedShipmentOperationalDetails',
    );
    expect(seed).toContain("'ORIGIN'");
    expect(seed).toContain("'DESTINATION'");
    expect(seed).toContain('DATE_FLEXIBILITY_CODES');
    expect(seed).toContain('deriveDateWindow');
    ELEVATOR_TYPE_CODES.forEach(code =>
      expect(seed).toContain(`'${code}'`),
    );
    VEHICLE_ACCESS_DISTANCE_CODES.forEach(code =>
      expect(seed).toContain(`'${code}'`),
    );
    expect(seed).toContain('[null, false, true]');
    expect(seed).not.toContain('ShipmentRound');
    expect(seed).not.toContain('accessPriceClass');
    expect(seed).not.toContain('shipment_media');
  });

  it('keeps new entity fields internal to persistence', () => {
    const shipment = source('src/domain/entities/Shipment.ts');
    const condition = source(
      'src/domain/entities/ShipmentLocationCondition.ts',
    );
    expect(shipment).toContain(
      'dateFlexibilityCode: DateFlexibilityCode | null',
    );
    expect(shipment).toContain(
      'locationConditions: ShipmentLocationCondition[]',
    );
    expect(condition).not.toMatch(/eager\s*:\s*true/);
    expect(condition).not.toMatch(/cascade\s*:\s*true/);
    expect(condition).toContain('select: false');

    const dto = source('src/application/dto/ShipmentDto.ts');
    const controller = source(
      'src/presentation/controllers/ShipmentController.ts',
    );
    for (const field of [
      'dateFlexibilityCode',
      'dateWindowStart',
      'dateWindowEnd',
      'locationConditions',
      'restrictionNote',
    ]) {
      expect(dto).not.toContain(field);
      expect(controller).not.toContain(field);
    }
  });

  it('registers baseline then M1A then M1B-1 without a legacy glob', () => {
    expect(CANONICAL_MIGRATIONS.slice(0, 3)).toEqual([
      CanonicalBaselineV11784500000000,
      AddShipmentV2IdentityCodes1784580000000,
      AddShipmentOperationalConditions1784660000000,
    ]);
    const runtime = source(
      'src/infrastructure/database/data-source.ts',
    );
    expect(runtime).toContain('CANONICAL_MIGRATIONS');
    expect(runtime).not.toMatch(
      /database\/migrations|migrationPatterns|migrations\/\*/,
    );
  });

  it('keeps down limited to M1B-1 objects', async () => {
    const statements = await collectStatements('down');
    const sql = statements.join('\n');
    expect(statements[0]).toContain(
      'DROP TABLE `shipment_location_conditions`',
    );
    expect(sql).toContain(
      'DROP COLUMN `date_flexibility_code`',
    );
    expect(sql).not.toContain('CanonicalBaseline');
    expect(sql).not.toContain('service_category_code');
    expect(sql).not.toContain('route_scope_code');
    expect(sql).not.toMatch(
      /DROP COLUMN `(?:shipment_date|date_flexibility)`/,
    );
  });

  it('preserves the canonical V1 baseline and stored manifest', () => {
    const baseline = source(
      'src/infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1.ts',
    );
    const manifest = JSON.parse(
      source('docs/database/canonical-v1-schema-manifest.json'),
    ) as CanonicalSchemaManifest;
    expect(baseline).not.toContain(
      'shipment_location_conditions',
    );
    expect(baseline).not.toContain('date_flexibility_code');
    expect(manifest.schemaFingerprint).toBe(
      'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1',
    );
  });
});
