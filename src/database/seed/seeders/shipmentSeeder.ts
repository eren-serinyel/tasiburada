import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Shipment, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Customer } from '../../../domain/entities/Customer';
import { Carrier } from '../../../domain/entities/Carrier';
import { LOAD_TYPES, EXTRA_SERVICES, CITIES } from '../data/constants';
import {
  randomFrom, randomInt, randomFloat,
  randomPastDate, randomFutureDate,
  randomLocation, pickRandom, generatePhone,
} from '../helpers/seedHelpers';

export async function seedShipments(
  customers: Customer[],
  carriers: Carrier[],
): Promise<Shipment[]> {
  const repo = AppDataSource.getRepository(Shipment);
  const created: Shipment[] = [];

  // Senaryo: 8 tamamlandı, 5 teklif bekleniyor, 4 eşleşti, 3 iptal edildi
  const scenarios: Array<{
    status: ShipmentStatus;
    count: number;
    daysAgo: number;
  }> = [
    { status: ShipmentStatus.COMPLETED, count: 8, daysAgo: 60 },
    { status: ShipmentStatus.PENDING, count: 5, daysAgo: 5 },
    { status: ShipmentStatus.MATCHED, count: 4, daysAgo: 10 },
    { status: ShipmentStatus.CANCELLED, count: 3, daysAgo: 30 },
  ];

  const verifiedCarriers = carriers.filter(c => c.verifiedByAdmin);

  for (const scenario of scenarios) {
    for (let i = 0; i < scenario.count; i++) {
      const customer = randomFrom(customers);
      const originCity = randomFrom(CITIES);
      let destCity = randomFrom(CITIES);
      while (destCity === originCity) {
        destCity = randomFrom(CITIES);
      }

      const createdAt = randomPastDate(scenario.daysAgo);
      const shipmentDate = scenario.status === ShipmentStatus.PENDING
        ? randomFutureDate(30)
        : randomPastDate(Math.max(scenario.daysAgo - 2, 1));

      const extraServices = pickRandom(EXTRA_SERVICES, randomInt(0, 3));

      const shipment = repo.create({
        customerId: customer.id,
        origin: randomLocation(originCity),
        destination: randomLocation(destCity),
        shipmentDate,
        transportType: randomFrom(['Kapalı Kasa', 'Açık Kasa', 'Frigorifik', 'Tanker']),
        loadDetails: randomFrom(LOAD_TYPES),
        weight: randomFloat(100, 5000),
        placeType: randomFrom(['Daire', 'Villa', 'Ofis', 'Depo']),
        floor: randomInt(0, 10),
        hasElevator: Math.random() > 0.5,
        insuranceType: randomFrom(['none', 'basic', 'full']),
        timePreference: randomFrom(['Sabah', 'Öğleden Sonra', 'Akşam', 'Esnek']),
        extraServices,
        note: Math.random() > 0.6
          ? randomFrom([
              'Kırılgan eşyalar var, dikkat edilsin.',
              'Piyano var, özel taşıma gerekiyor.',
              '3. kattan indirilecek, asansör yok.',
              'Antika mobilya mevcut.',
            ])
          : undefined,
        contactPhone: generatePhone(),
        status: scenario.status,
      });

      // Eşleşmiş veya tamamlanmışsa nakliyeci ata
      if (
        scenario.status === ShipmentStatus.MATCHED ||
        scenario.status === ShipmentStatus.COMPLETED
      ) {
        const assignedCarrier = randomFrom(verifiedCarriers);
        shipment.carrierId = assignedCarrier.id;
        shipment.price = randomFloat(500, 5000);
      }

      const saved = await repo.save(shipment);

      // createdAt'i senaryo tarihine ayarla (CreateDateColumn override)
      await repo.update(saved.id, { createdAt });

      saved.createdAt = createdAt;
      created.push(saved);
    }
  }

  console.log(`  ✓ ${created.length} taşıma talebi`);
  console.log(`     ${scenarios.map(s => `${s.count} ${s.status}`).join(', ')}`);
  return created;
}
