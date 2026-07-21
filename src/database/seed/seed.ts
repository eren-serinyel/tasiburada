import 'reflect-metadata';
import {
  AppDataSource,
  closeDatabase,
  initializeDatabase,
} from '../../infrastructure/database/data-source';
import { MatchingService } from '../../application/services/MatchingService';
import { ShipmentRepository } from '../../infrastructure/repositories/ShipmentRepository';
import { assertSafeSeedDatabase } from '../../infrastructure/database/seedSafety';
import { withSeedDataSource } from './seedDataSource';
import { runSeedWorkflow } from './seedWorkflow';

async function main(): Promise<void> {
  assertSafeSeedDatabase(process.env, 'reset');
  console.log('🚀 TaşıBurada Seed Başlıyor...\n');

  try {
    await initializeDatabase();
    console.log('');

    const result = await withSeedDataSource(AppDataSource, () =>
      runSeedWorkflow({ clearFirst: true, env: process.env }),
    );

    console.log('\n🎉 Seed tamamlandı!\n');
    console.log('📊 Özet:');
    console.log(`   Nakliyeci: ${result.carriers.length}`);
    console.log(`   Müşteri: ${result.customers.length}`);
    console.log(`   Taşıma: ${result.shipments.length}`);
    console.log(`   Teklif: ${result.offers.length}`);

    const matchingService = new MatchingService();
    const shipmentRepository = new ShipmentRepository();
    const eliteCarrier = result.carriers.find(
      carrier => carrier.email === 'info@silenakliyat.com',
    );
    if (eliteCarrier) {
      const carrierForMatching =
        await matchingService.getCarrierForMatching(eliteCarrier.id);
      const candidates =
        await shipmentRepository.findPendingShipmentsForCarrier(
          eliteCarrier.id,
        );
      const matchingCount = candidates.filter(shipment =>
        matchingService.isShipmentMatchingCarrier(
          shipment,
          carrierForMatching,
        ),
      ).length;
      console.log(`   Elite matching pending: ${matchingCount}`);
    }

    console.log('');
    console.log('🔑 Giriş bilgileri:');
    console.log('   Admin:     superadmin@tasiburadan.com / [seed şifresi]');
    console.log('   Nakliyeci: info@silenakliyat.com / [seed şifresi]');
    console.log('   Müşteri:   ahmet.yilmaz0@gmail.com / [seed şifresi]');
  } catch (error) {
    console.error('\n❌ Seed hatası:', error);

    if (error instanceof Error) {
      if (error.message.includes('ER_NO_SUCH_TABLE')) {
        console.error(
          "\n💡 Çözüm: Migration'ları çalıştır: npm run migration:run",
        );
      } else if (error.message.includes('ER_DUP_ENTRY')) {
        console.error(
          '\n💡 Çözüm: DB zaten dolu. clearDatabase() ilk adımda temizler, tekrar dene.',
        );
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error(
          '\n💡 Çözüm: MySQL sunucusu çalışıyor mu? docker-compose up -d',
        );
      } else if (error.message.includes('Cannot find module')) {
        console.error(
          '\n💡 Çözüm: Import yollarını kontrol et veya npm install yap.',
        );
      }
    }
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

void main();
