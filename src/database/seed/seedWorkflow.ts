import type { SeedSafetyEnvironment } from '../../infrastructure/database/seedSafety';
import { assertSafeSeedDatabase } from '../../infrastructure/database/seedSafety';
import type { Admin } from '../../domain/entities/Admin';
import type { Carrier } from '../../domain/entities/Carrier';
import type { Customer } from '../../domain/entities/Customer';
import type { Offer } from '../../domain/entities/Offer';
import type { Shipment } from '../../domain/entities/Shipment';
import { clearDatabase } from './clearDatabase';
import { seedPlatformSettings } from './seeders/settingsSeeder';
import { seedAdmins } from './seeders/adminSeeder';
import { seedLookupTables } from './seeders/lookupSeeder';
import { seedExtraServices } from './seeders/extraServiceSeeder';
import { seedCarriers } from './seeders/carrierSeeder';
import { seedCustomers } from './seeders/customerSeeder';
import { seedShipments } from './seeders/shipmentSeeder';
import { seedOffers } from './seeders/offerSeeder';
import { seedCompletedFlow } from './seeders/completedFlowSeeder';
import { seedNotifications } from './seeders/notificationSeeder';
import { seedAuditLogs } from './seeders/auditLogSeeder';
import {
  seedConverterCatalog,
  seedConverterVehicleRules,
} from './seeders/converterSeeder';

export interface SeedWorkflowResult {
  readonly admins: Admin[];
  readonly carriers: Carrier[];
  readonly customers: Customer[];
  readonly shipments: Shipment[];
  readonly offers: Offer[];
}

export interface SeedWorkflowOptions {
  readonly clearFirst: boolean;
  readonly env?: SeedSafetyEnvironment;
}

export const runSeedWorkflow = async ({
  clearFirst,
  env = process.env,
}: SeedWorkflowOptions): Promise<SeedWorkflowResult> => {
  assertSafeSeedDatabase(env, clearFirst ? 'reset' : 'seed');

  if (clearFirst) {
    console.log('🧹 Veritabanı temizleniyor...');
    await clearDatabase(env);
  }

  console.log('⚙️  Platform ayarları oluşturuluyor...');
  await seedPlatformSettings();

  console.log('📋 Referans veriler oluşturuluyor...');
  const { vehicleTypeMap, serviceTypeMap, scopeMap } =
    await seedLookupTables();
  const vehicleTypeIdMap = new Map(
    Object.entries(vehicleTypeMap).map(([name, vehicleType]) => [
      name,
      vehicleType.id,
    ]),
  );
  const extraServiceMap = await seedExtraServices();

  console.log('🧮 Converter referans verileri oluşturuluyor...');
  await seedConverterCatalog();
  await seedConverterVehicleRules();

  console.log('👤 Admin kullanıcılar oluşturuluyor...');
  const admins = await seedAdmins();

  console.log('🚛 Nakliyeciler oluşturuluyor...');
  const carriers = await seedCarriers(
    vehicleTypeMap,
    serviceTypeMap,
    scopeMap,
  );

  console.log('👥 Müşteriler oluşturuluyor...');
  const customers = await seedCustomers();

  console.log('📦 Taşıma talepleri oluşturuluyor...');
  const shipments = await seedShipments(
    customers,
    carriers,
    vehicleTypeIdMap,
    extraServiceMap,
  );

  console.log('💬 Teklifler oluşturuluyor...');
  const offers = await seedOffers(shipments, carriers);

  console.log('✅ Tamamlanan işler işleniyor...');
  await seedCompletedFlow(shipments, offers, carriers, customers);

  console.log('🔔 Bildirimler oluşturuluyor...');
  await seedNotifications(customers, carriers, shipments);

  console.log('📋 Audit log oluşturuluyor...');
  await seedAuditLogs(admins, carriers);

  return { admins, carriers, customers, shipments, offers };
};
