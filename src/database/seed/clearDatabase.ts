import type { SeedSafetyEnvironment } from '../../infrastructure/database/seedSafety';
import { assertSafeSeedDatabase } from '../../infrastructure/database/seedSafety';
import { cleanupSeededDocumentFiles } from './helpers/pdfHelper';
import { SeedDataSource } from './seedDataSource';

// Reverse topological order of the current canonical application tables.
// M0B's 46-table V1 inventory remains intact; additive M1 tables are inserted
// before their parents. This is shared by clear and seed-smoke checks.
export const CANONICAL_CLEAR_TABLES = [
  'shipment_home_move_items',
  'shipment_partial_items',
  'shipment_home_move_details',
  'shipment_office_move_details',
  'shipment_partial_item_details',
  'shipment_location_conditions',
  'shipment_custom_extra_services',
  'converter_results',
  'converter_answers',
  'carrier_extra_service_capabilities',
  'shipment_invites',
  'shipment_extra_services',
  'reviews',
  'payments',
  'offers',
  'favorite_carriers',
  'extra_service_applicability',
  'customer_carrier_relations',
  'customer_addresses',
  'converter_sessions',
  'carrier_vehicles',
  'carrier_vehicle_types',
  'carrier_stats',
  'carrier_service_types',
  'carrier_security_settings',
  'carrier_scope_of_work',
  'carrier_profile_status',
  'carrier_notification_preferences',
  'carrier_load_type_capabilities',
  'carrier_earnings_log',
  'carrier_earnings',
  'carrier_documents',
  'carrier_custom_extra_services',
  'carrier_available_dates',
  'carrier_activity',
  'vehicle_types',
  'shipments',
  'service_types',
  'scope_of_work',
  'platform_settings',
  'notifications',
  'messages',
  'match_cooldowns',
  'extra_services',
  'customers',
  'converter_vehicle_rules',
  'converter_item_catalog',
  'contact_filter_logs',
  'carriers',
  'carrier_extra_services',
  'audit_logs',
  'admins',
] as const;

export async function clearDatabase(
  env: SeedSafetyEnvironment = process.env,
): Promise<void> {
  assertSafeSeedDatabase(env, 'reset');
  const queryRunner = SeedDataSource.createQueryRunner();
  await queryRunner.connect();
  let foreignKeyChecksDisabled = false;

  try {
    const removedSeedFiles = cleanupSeededDocumentFiles();
    console.log(`  ✓ ${removedSeedFiles} seeded document file(s) removed`);

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');
    foreignKeyChecksDisabled = true;

    for (const table of CANONICAL_CLEAR_TABLES) {
      try {
        await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  ✓ ${table}`);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'unknown database error';
        throw new Error(`clearDatabase: ${table} temizlenemedi — ${message}`);
      }
    }

    console.log('✅ Veritabanı temizlendi\n');
  } finally {
    try {
      if (foreignKeyChecksDisabled) {
        await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      }
    } finally {
      await queryRunner.release();
    }
  }
}
