import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Offer, OfferStatus } from '../../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Carrier } from '../../../domain/entities/Carrier';
import { randomFloat, randomInt, randomFrom } from '../helpers/seedHelpers';

export async function seedOffers(
  shipments: Shipment[],
  carriers: Carrier[],
): Promise<Offer[]> {
  const repo = AppDataSource.getRepository(Offer);
  const created: Offer[] = [];
  const verifiedCarriers = carriers.filter(c => c.verifiedByAdmin);

  for (const shipment of shipments) {
    // İptal edilen ilanlara teklif yok
    if (shipment.status === ShipmentStatus.CANCELLED) continue;

    // Her ilana 2-5 farklı nakliyeci teklif versin
    const offerCount = randomInt(2, 5);
    const shuffled = [...verifiedCarriers].sort(() => Math.random() - 0.5);
    const offeringCarriers = shuffled.slice(0, offerCount);

    // Eşleşmiş/tamamlanmış ilanlarda atanmış nakliyeci listede olmalı
    if (
      (shipment.status === ShipmentStatus.MATCHED ||
       shipment.status === ShipmentStatus.COMPLETED) &&
      shipment.carrierId
    ) {
      const assignedIdx = offeringCarriers.findIndex(c => c.id === shipment.carrierId);
      if (assignedIdx === -1) {
        const assigned = verifiedCarriers.find(c => c.id === shipment.carrierId);
        if (assigned) {
          offeringCarriers[0] = assigned; // İlk sıraya koy
        }
      }
    }

    const basePrice = randomFloat(300, 2000);

    for (let i = 0; i < offeringCarriers.length; i++) {
      const carrier = offeringCarriers[i];
      const price = Math.round(basePrice * (0.8 + i * 0.15) / 10) * 10;

      let status: OfferStatus;

      if (shipment.status === ShipmentStatus.PENDING) {
        status = OfferStatus.PENDING;
      } else if (
        shipment.status === ShipmentStatus.MATCHED ||
        shipment.status === ShipmentStatus.COMPLETED
      ) {
        status = shipment.carrierId === carrier.id
          ? OfferStatus.ACCEPTED
          : OfferStatus.REJECTED;
      } else {
        status = OfferStatus.PENDING;
      }

      const messages = [
        'Deneyimli ekibimizle güvenle taşırız.',
        'Uygun fiyat, kaliteli hizmet garantisi.',
        'Sigortalı araçlarımızla eşyalarınız güvende.',
        'Hızlı ve özenli taşıma yapıyoruz.',
        'Profesyonel kadromuzla hizmetinizdeyiz.',
      ];

      const offer = repo.create({
        shipmentId: shipment.id,
        carrierId: carrier.id,
        price,
        message: Math.random() > 0.2 ? randomFrom(messages) : undefined,
        estimatedDuration: randomInt(2, 24),
        status,
      });

      created.push(await repo.save(offer));
    }
  }

  console.log(`  ✓ ${created.length} teklif`);
  return created;
}
