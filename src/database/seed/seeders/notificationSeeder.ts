import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Notification } from '../../../domain/entities/Notification';
import { Customer } from '../../../domain/entities/Customer';
import { Carrier } from '../../../domain/entities/Carrier';
import { Shipment, ShipmentStatus } from '../../../domain/entities/Shipment';
import { randomFrom } from '../helpers/seedHelpers';

export async function seedNotifications(
  customers: Customer[],
  carriers: Carrier[],
  shipments: Shipment[],
) {
  const repo = AppDataSource.getRepository(Notification);
  const created: Notification[] = [];

  // ── Müşterilere bildirim ──
  for (const shipment of shipments) {
    // Bekleyen ilanlara "Yeni teklif geldi" bildirimi
    if (
      shipment.status === ShipmentStatus.PENDING ||
      shipment.status === ShipmentStatus.OFFER_RECEIVED
    ) {
      const notif = repo.create({
        userId: shipment.customerId,
        userType: 'customer',
        type: 'offer_received',
        title: 'Yeni Teklif Geldi',
        message: 'Talebinize yeni bir teklif geldi. Teklifleri incelemek için tıklayın.',
        isRead: Math.random() > 0.5,
        relatedId: shipment.id,
      });
      created.push(await repo.save(notif));
    }

    // Eşleşmiş ilanlara "Nakliyeci eşleşti" bildirimi
    if (shipment.status === ShipmentStatus.MATCHED) {
      const notif = repo.create({
        userId: shipment.customerId,
        userType: 'customer',
        type: 'shipment_matched',
        title: 'Nakliyeci Eşleşti',
        message: 'Taşımanız için bir nakliyeci eşleştirildi. Detayları kontrol edin.',
        isRead: Math.random() > 0.4,
        relatedId: shipment.id,
      });
      created.push(await repo.save(notif));
    }

    // Tamamlanan ilanlara "Taşıma tamamlandı" bildirimi
    if (shipment.status === ShipmentStatus.COMPLETED) {
      const notif = repo.create({
        userId: shipment.customerId,
        userType: 'customer',
        type: 'shipment_completed',
        title: 'Taşıma Tamamlandı',
        message: 'Taşımanız başarıyla tamamlandı. Yorum yapmayı unutmayın!',
        isRead: Math.random() > 0.3,
        relatedId: shipment.id,
      });
      created.push(await repo.save(notif));
    }

    // İptal edilen ilanlara "Taşıma iptal edildi" bildirimi
    if (shipment.status === ShipmentStatus.CANCELLED) {
      const notif = repo.create({
        userId: shipment.customerId,
        userType: 'customer',
        type: 'shipment_cancelled',
        title: 'Taşıma İptal Edildi',
        message: 'Taşıma talebiniz iptal edilmiştir.',
        isRead: true,
        relatedId: shipment.id,
      });
      created.push(await repo.save(notif));
    }
  }

  // ── Nakliyecilere bildirim ──
  const routes = [
    'İstanbul - Ankara', 'İzmir - İstanbul', 'Bursa - Antalya',
    'Ankara - İzmir', 'Antalya - İstanbul', 'Bursa - İstanbul',
  ];

  for (const carrier of carriers.filter(c => c.verifiedByAdmin)) {
    // Yeni iş fırsatı bildirimi
    const notif = repo.create({
      userId: carrier.id,
      userType: 'carrier',
      type: 'new_shipment',
      title: 'Yeni İş Fırsatı',
      message: `Bölgenizdeki ${randomFrom(routes)} rotasında yeni bir ilan var.`,
      isRead: Math.random() > 0.4,
    });
    created.push(await repo.save(notif));

    // Teklif kabul bildirimi (onaylı nakliyecilere %50 ihtimalle)
    if (Math.random() > 0.5) {
      const notif2 = repo.create({
        userId: carrier.id,
        userType: 'carrier',
        type: 'offer_accepted',
        title: 'Teklifiniz Kabul Edildi',
        message: 'Müşteri teklifinizi kabul etti. İş detaylarını kontrol edin.',
        isRead: Math.random() > 0.3,
      });
      created.push(await repo.save(notif2));
    }
  }

  // ── Hoş geldiniz bildirimleri (tüm müşterilere) ──
  for (const customer of customers.slice(0, 5)) {
    const notif = repo.create({
      userId: customer.id,
      userType: 'customer',
      type: 'welcome',
      title: 'TaşıBurada\'ya Hoş Geldiniz!',
      message: 'Platformumuza kayıt olduğunuz için teşekkür ederiz. İlk taşımanızı oluşturun.',
      isRead: true,
    });
    created.push(await repo.save(notif));
  }

  console.log(`  ✓ ${created.length} bildirim`);
  return created;
}
