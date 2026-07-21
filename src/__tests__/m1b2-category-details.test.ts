import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { QueryRunner } from 'typeorm';
import {
  ARCHIVE_DENSITY_CODES,
  ARCHIVE_UNIT_COUNT_BAND_CODES,
  BOX_COUNT_BAND_CODES,
  HOME_SPECIAL_ITEM_TYPE_CODES,
  HOUSEHOLD_DENSITY_CODES,
  OFFICE_SIZE_BAND_CODES,
  PARTIAL_ITEM_TYPE_CODES,
  PARTIAL_SIZE_CLASS_CODES,
  RESIDENCE_TYPE_CODES,
  ROOM_LAYOUT_CODES,
  WORKSTATION_COUNT_BAND_CODES,
  isArchiveDensityCode,
  isArchiveUnitCountBandCode,
  isBoxCountBandCode,
  isSafeCategoryItemCustomLabel,
  isHomeSpecialItemTypeCode,
  isHouseholdDensityCode,
  isOfficeSizeBandCode,
  isPartialItemTypeCode,
  isPartialSizeClassCode,
  isResidenceTypeCode,
  isRoomLayoutCode,
  isValidCategoryItemLabel,
  isValidOfficeDeadline,
  isValidPartialItemMeasurements,
  isWorkstationCountBandCode,
} from '../domain/shipments/ShipmentCategoryDetailCodes';
import { CanonicalBaselineV11784500000000 } from '../infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1';
import { AddShipmentV2IdentityCodes1784580000000 } from '../infrastructure/database/canonical-migrations/1784580000000-AddShipmentV2IdentityCodes';
import { AddShipmentOperationalConditions1784660000000 } from '../infrastructure/database/canonical-migrations/1784660000000-AddShipmentOperationalConditions';
import { AddShipmentCategoryDetails1784740000000 } from '../infrastructure/database/canonical-migrations/1784740000000-AddShipmentCategoryDetails';
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
    new AddShipmentCategoryDetails1784740000000();
  const queryRunner = {
    query: async (statement: string) => {
      statements.push(statement);
      return [];
    },
  } as unknown as QueryRunner;
  await migration[direction](queryRunner);
  return statements;
};

describe('M1B-2 current mutable category details', () => {
  it('defines every exact independent category code set', () => {
    expect(RESIDENCE_TYPE_CODES).toEqual([
      'APARTMENT',
      'DUPLEX',
      'DETACHED_HOUSE',
      'VILLA',
      'OTHER',
      'UNKNOWN',
    ]);
    expect(ROOM_LAYOUT_CODES).toEqual([
      'STUDIO_1_0',
      'ONE_PLUS_ONE',
      'TWO_PLUS_ONE',
      'THREE_PLUS_ONE',
      'FOUR_PLUS_ONE',
      'FIVE_PLUS_ONE_OR_MORE',
      'OTHER',
      'UNKNOWN',
    ]);
    expect(HOUSEHOLD_DENSITY_CODES).toEqual([
      'LIGHT',
      'STANDARD',
      'DENSE',
      'VERY_DENSE_MULTI_VEHICLE_POSSIBLE',
      'UNKNOWN',
    ]);
    expect(BOX_COUNT_BAND_CODES).toEqual([
      'ZERO_TO_10',
      'ELEVEN_TO_25',
      'TWENTY_SIX_TO_50',
      'FIFTY_ONE_TO_80',
      'OVER_80',
      'UNKNOWN',
    ]);
    expect(HOME_SPECIAL_ITEM_TYPE_CODES).toEqual([
      'PIANO',
      'SAFE',
      'LARGE_AQUARIUM',
      'ANTIQUE',
      'MARBLE_TABLE',
      'LARGE_BOOKCASE',
      'EXERCISE_EQUIPMENT',
      'LARGE_SCREEN_TV',
      'AMERICAN_STYLE_REFRIGERATOR',
      'OTHER',
    ]);
    expect(OFFICE_SIZE_BAND_CODES).toEqual([
      'ZERO_TO_50_SQM',
      'FIFTY_ONE_TO_100_SQM',
      'ONE_HUNDRED_ONE_TO_250_SQM',
      'TWO_HUNDRED_FIFTY_ONE_TO_500_SQM',
      'OVER_500_SQM',
      'UNKNOWN',
    ]);
    expect(WORKSTATION_COUNT_BAND_CODES).toEqual([
      'ONE_TO_5',
      'SIX_TO_15',
      'SIXTEEN_TO_30',
      'THIRTY_ONE_TO_60',
      'OVER_60',
      'UNKNOWN',
    ]);
    expect(ARCHIVE_UNIT_COUNT_BAND_CODES).toEqual([
      'ZERO',
      'ONE_TO_5',
      'SIX_TO_15',
      'SIXTEEN_TO_30',
      'OVER_30',
      'UNKNOWN',
    ]);
    expect(ARCHIVE_DENSITY_CODES).toEqual([
      'NONE',
      'LIGHT',
      'STANDARD',
      'DENSE',
      'VERY_DENSE',
      'UNKNOWN',
    ]);
    expect(PARTIAL_ITEM_TYPE_CODES).toEqual([
      'SOFA',
      'ARMCHAIR',
      'BED',
      'WARDROBE',
      'TABLE',
      'CHAIR',
      'WASHING_MACHINE',
      'DISHWASHER',
      'REFRIGERATOR',
      'TELEVISION',
      'DESK',
      'BOOKCASE',
      'BOX',
      'PIANO',
      'SAFE',
      'OTHER',
    ]);
    expect(PARTIAL_SIZE_CLASS_CODES).toEqual([
      'STANDARD',
      'LARGE_TWO_PERSON',
      'OVERSIZED_SPECIAL_EQUIPMENT',
      'MEASUREMENTS_PROVIDED',
      'UNKNOWN',
    ]);
  });

  it('keeps code guards separated by responsibility', () => {
    expect(isResidenceTypeCode('APARTMENT')).toBe(true);
    expect(isRoomLayoutCode('STUDIO_1_0')).toBe(true);
    expect(isHouseholdDensityCode('DENSE')).toBe(true);
    expect(isBoxCountBandCode('OVER_80')).toBe(true);
    expect(isHomeSpecialItemTypeCode('PIANO')).toBe(true);
    expect(isOfficeSizeBandCode('OVER_500_SQM')).toBe(true);
    expect(isWorkstationCountBandCode('SIX_TO_15')).toBe(true);
    expect(isArchiveUnitCountBandCode('ZERO')).toBe(true);
    expect(isArchiveDensityCode('VERY_DENSE')).toBe(true);
    expect(isPartialItemTypeCode('SOFA')).toBe(true);
    expect(
      isPartialSizeClassCode('MEASUREMENTS_PROVIDED'),
    ).toBe(true);
    expect(isResidenceTypeCode('STUDIO_1_0')).toBe(false);
    expect(isOfficeSizeBandCode('HOME_MOVE')).toBe(false);
    expect(isPartialItemTypeCode('STORAGE')).toBe(false);
  });

  it('rejects unsafe or missing OTHER custom labels', () => {
    expect(
      isSafeCategoryItemCustomLabel('Özel sanat eseri'),
    ).toBe(true);
    for (const unsafe of [
      '0555 111 22 33',
      'test@example.com',
      'https://example.com',
      '<b>eşya</b>',
      'Örnek Mah. No: 12',
    ]) {
      expect(isSafeCategoryItemCustomLabel(unsafe)).toBe(false);
    }
    expect(isValidCategoryItemLabel('OTHER', null)).toBe(false);
    expect(
      isValidCategoryItemLabel('OTHER', 'Özel dekoratif eşya'),
    ).toBe(true);
    expect(isValidCategoryItemLabel('PIANO', null)).toBe(true);
  });

  it('validates office deadline tri-state semantics', () => {
    expect(
      isValidOfficeDeadline(true, '2026-08-01T12:00:00Z'),
    ).toBe(true);
    expect(isValidOfficeDeadline(true, null)).toBe(false);
    expect(isValidOfficeDeadline(false, null)).toBe(true);
    expect(
      isValidOfficeDeadline(false, '2026-08-01T12:00:00Z'),
    ).toBe(false);
    expect(isValidOfficeDeadline(null, null)).toBe(true);
  });

  it('validates all-or-none partial measurements', () => {
    expect(
      isValidPartialItemMeasurements(
        'MEASUREMENTS_PROVIDED',
        100,
        200,
        80,
      ),
    ).toBe(true);
    expect(
      isValidPartialItemMeasurements(
        'MEASUREMENTS_PROVIDED',
        100,
        null,
        80,
      ),
    ).toBe(false);
    expect(
      isValidPartialItemMeasurements(
        'STANDARD',
        null,
        null,
        null,
      ),
    ).toBe(true);
    expect(
      isValidPartialItemMeasurements(
        'STANDARD',
        100,
        null,
        null,
      ),
    ).toBe(false);
  });

  it('creates only the five current category tables', async () => {
    const sql = (await collectStatements('up')).join('\n');
    for (const table of [
      'shipment_home_move_details',
      'shipment_home_move_items',
      'shipment_office_move_details',
      'shipment_partial_item_details',
      'shipment_partial_items',
    ]) {
      expect(sql).toContain(`CREATE TABLE \`${table}\``);
    }
    expect(sql.match(/CREATE TABLE/g)).toHaveLength(5);
    for (const forbidden of [
      'shipment_round',
      'snapshot',
      'pricing',
      'assessment',
      'reservation',
      'purchase',
      'payment',
      'credit',
      'refund',
      'media',
      'photo',
      'authentication',
    ]) {
      expect(sql.toLowerCase()).not.toContain(forbidden);
    }
  });

  it('enforces one category-safe root per shipment', async () => {
    const sql = (await collectStatements('up')).join('\n');
    for (const category of [
      'HOME_MOVE',
      'OFFICE_MOVE',
      'PARTIAL_ITEM',
    ]) {
      expect(sql).toContain(
        `CHECK (\`service_category_code\` = '${category}')`,
      );
    }
    expect(sql.match(/PRIMARY KEY \(`shipment_id`\)/g))
      .toHaveLength(3);
    expect(sql.match(
      /FOREIGN KEY \(\s*`shipment_id`,\s*`service_category_code`\s*\)[\s\S]*?REFERENCES `shipments` \(\s*`id`,\s*`service_category_code`\s*\)/g,
    )).toHaveLength(3);
  });

  it('uses safe child-parent ownership without item uniqueness', async () => {
    const sql = (await collectStatements('up')).join('\n');
    expect(sql).toMatch(
      /FK_home_items_home_detail[\s\S]*REFERENCES `shipment_home_move_details`[\s\S]*ON DELETE CASCADE ON UPDATE RESTRICT/,
    );
    expect(sql).toMatch(
      /FK_partial_items_partial_detail[\s\S]*REFERENCES `shipment_partial_item_details`[\s\S]*ON DELETE CASCADE ON UPDATE RESTRICT/,
    );
    expect(sql).not.toMatch(
      /UNIQUE[^\n]*(?:home_move_items|partial_items)/i,
    );
    expect(sql).toContain(
      'CHECK (`quantity` BETWEEN 1 AND 100)',
    );
    expect(sql).toContain(
      'CHECK (`quantity` BETWEEN 1 AND 1000)',
    );
  });

  it('keeps nullable home fields and excludes common details', async () => {
    const sql = (await collectStatements('up')).join('\n');
    const home = sql.slice(
      sql.indexOf('CREATE TABLE `shipment_home_move_details`'),
      sql.indexOf('CREATE TABLE `shipment_home_move_items`'),
    );
    for (const field of [
      'residence_type_code',
      'room_layout_code',
      'household_density_code',
      'box_count_band_code',
    ]) {
      expect(home).toMatch(
        new RegExp(`${field}[\\s\\S]{0,100}DEFAULT NULL`),
      );
    }
    for (const duplicate of [
      'floor_number',
      'elevator',
      'shipment_date',
      'route_scope',
      'vehicle_access',
      'packaging',
      'assembly',
    ]) {
      expect(home).not.toContain(duplicate);
    }
  });

  it('enforces nullable office booleans and deadline consistency', async () => {
    const sql = (await collectStatements('up')).join('\n');
    expect(sql).toContain(
      '`completion_deadline_at` datetime(3) DEFAULT NULL',
    );
    expect(sql).toContain(
      'CHK_office_details_boolean_values',
    );
    expect(sql).toContain(
      'CHK_office_details_fixed_deadline',
    );
    expect(sql).not.toContain('employee_count');
  });

  it('stores partial item facts without duplicate summaries', async () => {
    const sql = (await collectStatements('up')).join('\n');
    const rootStart = sql.indexOf(
      'CREATE TABLE `shipment_partial_item_details`',
    );
    const itemStart = sql.indexOf(
      'CREATE TABLE `shipment_partial_items`',
    );
    const rootSql = sql.slice(rootStart, itemStart);
    for (const summary of [
      'total_quantity',
      'has_fragile',
      'total_weight',
      'largest_dimension',
    ]) {
      expect(rootSql).not.toContain(summary);
    }
    expect(sql).toContain('CHK_partial_items_dimensions');
    expect(sql).toContain(
      'CHK_partial_items_measurement_semantics',
    );
    expect(sql).toContain('CHK_partial_items_weight');
  });

  it('backfills roots without inferred category facts or items', async () => {
    const statements = await collectStatements('up');
    const backfill = statements
      .filter(statement => statement.startsWith('INSERT INTO'))
      .join('\n');
    expect(backfill).toContain(
      "WHERE `service_category_code` = 'HOME_MOVE'",
    );
    expect(backfill).toContain(
      "WHERE `service_category_code` = 'OFFICE_MOVE'",
    );
    expect(backfill).toContain(
      "WHERE `service_category_code` = 'PARTIAL_ITEM'",
    );
    expect(backfill).toContain(
      "WHEN 'Daire' THEN 'APARTMENT'",
    );
    expect(backfill).toContain(
      "WHEN 'Müstakil Ev' THEN 'DETACHED_HOUSE'",
    );
    expect(backfill).toContain('ELSE NULL');
    expect(backfill).not.toContain(
      'INSERT INTO `shipment_home_move_items`',
    );
    expect(backfill).not.toContain(
      'INSERT INTO `shipment_partial_items`',
    );
    expect(backfill).not.toContain("'STANDARD'");
    expect(backfill).not.toContain("'UNKNOWN'");
    expect(backfill).not.toContain("'STORAGE'");
  });

  it('seeds only matching categories when the complete schema exists', () => {
    const seed = source(
      'src/database/seed/seeders/shipmentSeeder.ts',
    );
    expect(seed).toContain(
      'persistSeedShipmentCategoryDetails',
    );
    expect(seed).toContain(
      'CATEGORY_DETAIL_TABLES.map',
    );
    for (const category of [
      "case 'HOME_MOVE'",
      "case 'OFFICE_MOVE'",
      "case 'PARTIAL_ITEM'",
    ]) {
      expect(seed).toContain(category);
    }
    expect(seed).not.toContain("case 'STORAGE'");
    expect(seed).toContain('Özel sanat eseri');
    expect(seed).toContain('Özel dekoratif eşya');
    expect(seed).toContain(
      "sizeClass === 'MEASUREMENTS_PROVIDED'",
    );
  });

  it('clears child tables before subtype roots and shipments', () => {
    const clear = source('src/database/seed/clearDatabase.ts');
    const homeItem = clear.indexOf(
      "'shipment_home_move_items'",
    );
    const partialItem = clear.indexOf(
      "'shipment_partial_items'",
    );
    const homeRoot = clear.indexOf(
      "'shipment_home_move_details'",
    );
    const officeRoot = clear.indexOf(
      "'shipment_office_move_details'",
    );
    const partialRoot = clear.indexOf(
      "'shipment_partial_item_details'",
    );
    const shipments = clear.indexOf("'shipments'");
    expect(homeItem).toBeLessThan(homeRoot);
    expect(partialItem).toBeLessThan(partialRoot);
    expect(homeRoot).toBeLessThan(shipments);
    expect(officeRoot).toBeLessThan(shipments);
    expect(partialRoot).toBeLessThan(shipments);
  });

  it('keeps entity details internal to persistence', () => {
    const entityPaths = [
      'src/domain/entities/ShipmentHomeMoveDetail.ts',
      'src/domain/entities/ShipmentHomeMoveItem.ts',
      'src/domain/entities/ShipmentOfficeMoveDetail.ts',
      'src/domain/entities/ShipmentPartialItemDetail.ts',
      'src/domain/entities/ShipmentPartialItem.ts',
    ];
    for (const entityPath of entityPaths) {
      const entity = source(entityPath);
      expect(entity).not.toMatch(/eager\s*:\s*true/);
      expect(entity).not.toMatch(/cascade\s*:\s*true/);
    }
    expect(
      source('src/domain/entities/ShipmentHomeMoveItem.ts'),
    ).toContain('select: false');
    expect(
      source('src/domain/entities/ShipmentPartialItem.ts'),
    ).toContain('select: false');
    expect(
      source('src/domain/entities/ShipmentHomeMoveItem.ts'),
    ).toContain('isValidCategoryItemLabel');
    expect(
      source('src/domain/entities/ShipmentPartialItem.ts'),
    ).toContain('isValidPartialItemMeasurements');
    expect(
      source('src/domain/entities/ShipmentOfficeMoveDetail.ts'),
    ).toContain('isValidOfficeDeadline');
    const dto = source('src/application/dto/ShipmentDto.ts');
    const controller = source(
      'src/presentation/controllers/ShipmentController.ts',
    );
    for (const field of [
      'homeMoveDetail',
      'officeMoveDetail',
      'partialItemDetail',
      'customLabel',
      'roomLayoutCode',
    ]) {
      expect(dto).not.toContain(field);
      expect(controller).not.toContain(field);
    }
  });

  it('registers baseline through M1B-2 without a legacy glob', () => {
    expect(CANONICAL_MIGRATIONS.slice(0, 4)).toEqual([
      CanonicalBaselineV11784500000000,
      AddShipmentV2IdentityCodes1784580000000,
      AddShipmentOperationalConditions1784660000000,
      AddShipmentCategoryDetails1784740000000,
    ]);
    const runtime = source(
      'src/infrastructure/database/data-source.ts',
    );
    expect(runtime).toContain('CANONICAL_MIGRATIONS');
    expect(runtime).not.toMatch(
      /database\/migrations|migrationPatterns|migrations\/\*/,
    );
  });

  it('keeps down limited to the five M1B-2 tables', async () => {
    const statements = await collectStatements('down');
    expect(statements).toHaveLength(5);
    const sql = statements.join('\n');
    for (const table of [
      'shipment_home_move_details',
      'shipment_home_move_items',
      'shipment_office_move_details',
      'shipment_partial_item_details',
      'shipment_partial_items',
    ]) {
      expect(sql).toContain(`DROP TABLE \`${table}\``);
    }
    expect(sql).not.toContain('shipments`');
    expect(sql).not.toContain('shipment_location_conditions');
  });

  it('preserves baseline and stored V1 manifest', () => {
    const baseline = source(
      'src/infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1.ts',
    );
    const manifest = JSON.parse(
      source('docs/database/canonical-v1-schema-manifest.json'),
    ) as CanonicalSchemaManifest;
    expect(baseline).not.toContain(
      'shipment_home_move_details',
    );
    expect(baseline).not.toContain(
      'shipment_partial_items',
    );
    expect(manifest.schemaFingerprint).toBe(
      'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1',
    );
  });
});
