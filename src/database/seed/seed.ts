import 'reflect-metadata';
import { AppDataSource, initializeDatabase, closeDatabase } from '../../infrastructure/database/data-source';
import { ExtraService } from '../../domain/entities/ExtraService';
import { clearDatabase } from './clearDatabase';
import { EXTRA_SERVICES } from './data/constants';
import { seedPlatformSettings } from './seeders/settingsSeeder';
import { seedAdmins } from './seeders/adminSeeder';
import { seedLookupTables } from './seeders/lookupSeeder';
import { seedCarriers } from './seeders/carrierSeeder';
import { seedCustomers } from './seeders/customerSeeder';
import { seedShipments } from './seeders/shipmentSeeder';
import { seedOffers } from './seeders/offerSeeder';
import { seedCompletedFlow } from './seeders/completedFlowSeeder';
import { seedNotifications } from './seeders/notificationSeeder';
import { seedAuditLogs } from './seeders/auditLogSeeder';

async function main() {
  console.log('🚀 TaşıBurada Seed Başlıyor...\n');

  try {
    await initializeDatabase();
    console.log('');

    // 1. Temizle
    console.log('🧹 Veritabanı temizleniyor...');
    await clearDatabase();

    // 2. Platform ayarları
    console.log('⚙️  Platform ayarları oluşturuluyor...');
    await seedPlatformSettings();

    // 3. Lookup tablolar (VehicleType, ServiceType, ScopeOfWork)
    console.log('📋 Referans veriler oluşturuluyor...');
    const { vehicleTypeMap, serviceTypeMap, scopeMap } = await seedLookupTables();
    const vehicleTypeIdMap = new Map(Object.entries(vehicleTypeMap).map(([name, vehicleType]) => [name, vehicleType.id]));
    const extraRepo = AppDataSource.getRepository(ExtraService);
    const extraServiceMap = new Map<string, string>();

    for (const [index, name] of EXTRA_SERVICES.entries()) {
      let existing = await extraRepo.findOne({ where: { name } });
      if (!existing) {
        existing = await extraRepo.save(extraRepo.create({
          name,
          description: null,
          status: 'ACTIVE',
          sortOrder: index + 1,
        }));
      }
      extraServiceMap.set(name, existing.id);
    }

    // 4. Admin kullanıcılar
    console.log('👤 Admin kullanıcılar oluşturuluyor...');
    const admins = await seedAdmins();

    // 5. Nakliyeciler
    console.log('🚛 Nakliyeciler oluşturuluyor...');
    const carriers = await seedCarriers(vehicleTypeMap, serviceTypeMap, scopeMap);

    // 6. Müşteriler
    console.log('👥 Müşteriler oluşturuluyor...');
    const customers = await seedCustomers();

    // 7. Taşıma talepleri
    console.log('📦 Taşıma talepleri oluşturuluyor...');
    const shipments = await seedShipments(customers, carriers, vehicleTypeIdMap, extraServiceMap);

    // 8. Teklifler
    console.log('💬 Teklifler oluşturuluyor...');
    const offers = await seedOffers(shipments, carriers);

    // 9. Tamamlanan akış (Kabul → taşıma → tamamlama → yorum → ödeme)
    console.log('✅ Tamamlanan işler işleniyor...');
    await seedCompletedFlow(shipments, offers, carriers, customers);

    // 10. Bildirimler
    console.log('🔔 Bildirimler oluşturuluyor...');
    await seedNotifications(customers, carriers, shipments);

    // 11. Audit log
    console.log('📋 Audit log oluşturuluyor...');
    await seedAuditLogs(admins, carriers);

    console.log('\n🎉 Seed tamamlandı!\n');
    console.log('📊 Özet:');
    console.log(`   Nakliyeci: ${carriers.length}`);
    console.log(`   Müşteri: ${customers.length}`);
    console.log(`   Taşıma: ${shipments.length}`);
    console.log(`   Teklif: ${offers.length}`);
    console.log('');
    console.log('🔑 Giriş bilgileri:');
    console.log('   Admin:     superadmin@tasiburada.com / Maviface2141');
    console.log('   Nakliyeci: info@silenakliyat.com / Maviface2141');
    console.log('   Müşteri:   ahmet.yilmaz0@gmail.com / Maviface2141');

  } catch (error) {
    console.error('\n❌ Seed hatası:', error);

    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        console.error('\n💡 Çözüm: Migration\'ları çalıştır: npm run migration:run');
      } else if (error.message.includes('ER_DUP_ENTRY')) {
        console.error('\n💡 Çözüm: DB zaten dolu. clearDatabase() ilk adımda temizler, tekrar dene.');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Çözüm: MySQL sunucusu çalışıyor mu? docker-compose up -d');
      } else if (error.message.includes('Cannot find module')) {
        console.error('\n💡 Çözüm: Import yollarını kontrol et veya npm install yap.');
      }
    }
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
