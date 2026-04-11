import { AppDataSource } from '../../infrastructure/database/data-source';

export async function clearDatabase(): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

    // Tüm tabloları sırayla temizle (migrations tablosuna dokunma)
    const tables = [
      'audit_logs',
      'notifications',
      'reviews',
      'payments',
      'carrier_earnings_log',
      'offers',
      'shipment_invites',
      'customer_carrier_relations',
      'favorite_carriers',
      'customer_addresses',
      'carrier_vehicle_types',
      'carrier_scope_of_work',
      'carrier_service_types',
      'carrier_profile_status',
      'carrier_activity',
      'carrier_documents',
      'carrier_earnings',
      'carrier_security_settings',
      'carrier_notification_preferences',
      'carrier_stats',
      'vehicles',
      'shipments',
      'admins',
      'customers',
      'carriers',
      'platform_settings',
      // Lookup tablolar en sonda (başka tablolar bunlara FK referans veriyor)
      'vehicle_types',
      'service_types',
      'scope_of_work',
    ];

    for (const table of tables) {
      try {
        await queryRunner.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  ✓ ${table}`);
      } catch (err: any) {
        // Tablo yoksa atla
        if (err.message?.includes('ER_NO_SUCH_TABLE') || err.errno === 1146) {
          console.warn(`  ⚠ ${table} atlandı (tablo yok)`);
        } else {
          console.warn(`  ⚠ ${table} atlandı: ${err.message}`);
        }
      }
    }

    await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Veritabanı temizlendi\n');
  } finally {
    await queryRunner.release();
  }
}
