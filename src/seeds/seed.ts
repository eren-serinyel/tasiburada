import 'reflect-metadata';
import { AppDataSource, initializeDatabase, closeDatabase } from '../infrastructure/database/data-source';

/**
 * Veritabanına temel (lookup) verileri yükler.
 * Migration'lar çalıştıktan sonra bir kez çalıştırılmalıdır.
 * 
 * Kullanım: npx ts-node src/seeds/seed.ts
 */
async function seed() {
  await initializeDatabase();
  const qr = AppDataSource.createQueryRunner();

  try {
    await qr.startTransaction();

    // ── Vehicle Types ──
    const vehicleTypes = [
      { name: 'Kamyonet', defaultCapacityKg: 3500, defaultCapacityM3: 15 },
      { name: 'Panel Van', defaultCapacityKg: 1500, defaultCapacityM3: 8 },
      { name: 'Kamyon', defaultCapacityKg: 15000, defaultCapacityM3: 45 },
      { name: 'Tır', defaultCapacityKg: 40000, defaultCapacityM3: 90 },
    ];

    for (const vt of vehicleTypes) {
      const exists = await qr.query(
        `SELECT id FROM vehicle_types WHERE name = ? LIMIT 1`,
        [vt.name]
      );
      if (exists.length === 0) {
        await qr.query(
          `INSERT INTO vehicle_types (id, name, defaultCapacityKg, defaultCapacityM3) VALUES (UUID(), ?, ?, ?)`,
          [vt.name, vt.defaultCapacityKg, vt.defaultCapacityM3]
        );
      }
    }

    // ── Service Types ──
    const serviceTypes = [
      'Evden Eve Nakliyat',
      'Parça Eşya Taşıma',
      'Şehirlerarası Taşıma',
      'Şehir İçi Taşıma',
      'Ofis Taşıma',
      'Eşya Depolama',
    ];

    for (const name of serviceTypes) {
      const exists = await qr.query(
        `SELECT id FROM service_types WHERE name = ? LIMIT 1`,
        [name]
      );
      if (exists.length === 0) {
        await qr.query(
          `INSERT INTO service_types (id, name) VALUES (UUID(), ?)`,
          [name]
        );
      }
    }

    // ── Scope of Work ──
    const scopes = [
      'Şehir İçi',
      'Şehirler Arası',
      'Uluslararası',
    ];

    for (const name of scopes) {
      const exists = await qr.query(
        `SELECT id FROM scope_of_work WHERE name = ? LIMIT 1`,
        [name]
      );
      if (exists.length === 0) {
        await qr.query(
          `INSERT INTO scope_of_work (id, name) VALUES (UUID(), ?)`,
          [name]
        );
      }
    }

    await qr.commitTransaction();
  } catch (err) {
    await qr.rollbackTransaction();
    console.error('❌ Seed hatası:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await closeDatabase();
  }
}

seed();
