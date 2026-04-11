import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Review } from '../../../domain/entities/Review';
import { Payment, PaymentStatus, PaymentMethod } from '../../../domain/entities/Payment';
import { CarrierEarningsLog } from '../../../domain/entities/CarrierEarningsLog';
import { CustomerCarrierRelation } from '../../../domain/entities/CustomerCarrierRelation';
import { Shipment, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Offer } from '../../../domain/entities/Offer';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierStats } from '../../../domain/entities/CarrierStats';
import { Customer } from '../../../domain/entities/Customer';
import { randomInt, randomFrom, randomPastDate, calcAvgRating } from '../helpers/seedHelpers';
import { REVIEW_COMMENTS } from '../data/constants';

export async function seedCompletedFlow(
  shipments: Shipment[],
  _offers: Offer[],
  carriers: Carrier[],
  _customers: Customer[],
) {
  const reviewRepo = AppDataSource.getRepository(Review);
  const paymentRepo = AppDataSource.getRepository(Payment);
  const earningsRepo = AppDataSource.getRepository(CarrierEarningsLog);
  const relationRepo = AppDataSource.getRepository(CustomerCarrierRelation);
  const carrierRepo = AppDataSource.getRepository(Carrier);
  const statsRepo = AppDataSource.getRepository(CarrierStats);

  const completedShipments = shipments.filter(
    s => s.status === ShipmentStatus.COMPLETED
  );

  // Nakliyeci bazlı rating takibi
  const carrierRatings: Record<string, number[]> = {};
  let reviewCount = 0;
  let paymentCount = 0;
  let relationCount = 0;

  for (const shipment of completedShipments) {
    if (!shipment.carrierId || !shipment.customerId) continue;

    // ── 1. Yorum oluştur (%80 ihtimalle) ──
    if (Math.random() > 0.2) {
      const rating = randomInt(3, 5) as 3 | 4 | 5;
      const comments = REVIEW_COMMENTS[rating];

      const review = reviewRepo.create({
        shipmentId: shipment.id,
        carrierId: shipment.carrierId,
        customerId: shipment.customerId,
        rating,
        comment: randomFrom(comments),
      });
      await reviewRepo.save(review);
      reviewCount++;

      // Rating takip et
      if (!carrierRatings[shipment.carrierId]) {
        carrierRatings[shipment.carrierId] = [];
      }
      carrierRatings[shipment.carrierId].push(rating);
    }

    // ── 2. Ödeme kaydı oluştur ──
    const price = shipment.price ?? randomInt(500, 3000);
    const completedAt = randomPastDate(30);

    const payment = paymentRepo.create({
      shipmentId: shipment.id,
      customerId: shipment.customerId,
      amount: price,
      method: randomFrom([
        PaymentMethod.CREDIT_CARD,
        PaymentMethod.BANK_TRANSFER,
        PaymentMethod.CASH,
      ]),
      status: PaymentStatus.COMPLETED,
      transactionId: `TXN-${Date.now()}-${randomInt(1000, 9999)}`,
      completedAt,
    });
    await paymentRepo.save(payment);
    paymentCount++;

    // ── 3. Kazanç kaydı oluştur ──
    // CarrierEarningsLog entity'sinde sadece amount var (commission yok),
    // bu yüzden komisyon düşülmüş net tutarı kaydediyoruz.
    const commission = Math.round(Number(price) * 0.1);
    const netEarnings = Number(price) - commission;

    try {
      const log = earningsRepo.create({
        carrierId: shipment.carrierId,
        shipmentId: shipment.id,
        amount: netEarnings,
      });
      await earningsRepo.save(log);
    } catch {
      // Entity yoksa veya tablo yoksa atla
    }

    // ── 4. CustomerCarrierRelation güncelle ──
    try {
      const existing = await relationRepo.findOne({
        where: {
          customerId: shipment.customerId,
          carrierId: shipment.carrierId,
        }
      });

      if (existing) {
        existing.completedJobsCount += 1;
        existing.lastShipmentId = shipment.id;
        await relationRepo.save(existing);
      } else {
        const relation = relationRepo.create({
          customerId: shipment.customerId,
          carrierId: shipment.carrierId,
          firstShipmentId: shipment.id,
          lastShipmentId: shipment.id,
          completedJobsCount: 1,
          isSaved: Math.random() > 0.7,
          canInviteAgain: true,
        });
        await relationRepo.save(relation);
        relationCount++;
      }
    } catch (err: any) {
      console.warn(`  ⚠ CustomerCarrierRelation atlandı: ${err.message}`);
    }
  }

  // ── 5. Nakliyeci puanlarını yorumlara göre güncelle ──
  for (const [carrierId, ratings] of Object.entries(carrierRatings)) {
    const avgRating = calcAvgRating(ratings);
    await carrierRepo.update(carrierId, {
      rating: avgRating,
      completedShipments: ratings.length,
    });

    // CarrierStats'ı da güncelle
    try {
      const stats = await statsRepo.findOne({ where: { carrierId } });
      if (stats) {
        stats.averageRating = avgRating;
        stats.totalReviews = ratings.length;
        stats.totalJobs = ratings.length;
        await statsRepo.save(stats);
      }
    } catch {
      // Stats entity yoksa atla
    }
  }

  console.log(`  ✓ ${completedShipments.length} tamamlanan akış`);
  console.log(`     ${reviewCount} yorum, ${paymentCount} ödeme, ${relationCount} ilişki`);
}
