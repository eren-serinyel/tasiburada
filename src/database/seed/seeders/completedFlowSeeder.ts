import { AppDataSource } from '../../../infrastructure/database/data-source';
import { Review } from '../../../domain/entities/Review';
import { Payment, PaymentMethod, PaymentStatus } from '../../../domain/entities/Payment';
import { CarrierEarningsLog } from '../../../domain/entities/CarrierEarningsLog';
import { CustomerCarrierRelation } from '../../../domain/entities/CustomerCarrierRelation';
import { Shipment, ShipmentStatus } from '../../../domain/entities/Shipment';
import { Offer } from '../../../domain/entities/Offer';
import { Carrier } from '../../../domain/entities/Carrier';
import { CarrierStats } from '../../../domain/entities/CarrierStats';
import { Customer } from '../../../domain/entities/Customer';
import {
  calcAvgRating,
  chance,
  randomFrom,
  randomInt,
  randomPastDateBetween,
  randomWeightedFrom,
} from '../helpers/seedHelpers';
import { REVIEW_COMMENTS } from '../data/constants';

const PAYMENT_METHOD_WEIGHTS = [
  { method: PaymentMethod.BANK_TRANSFER, weight: 60 },
  { method: PaymentMethod.CREDIT_CARD, weight: 30 },
  { method: PaymentMethod.CASH, weight: 10 },
] as const;

const PAYMENT_STATUS_WEIGHTS = [
  { status: PaymentStatus.COMPLETED, weight: 95 },
  { status: PaymentStatus.PENDING, weight: 3 },
  { status: PaymentStatus.FAILED, weight: 2 },
] as const;

const REVIEW_RATING_WEIGHTS = [
  { rating: 1, weight: 3 },
  { rating: 2, weight: 5 },
  { rating: 3, weight: 12 },
  { rating: 4, weight: 35 },
  { rating: 5, weight: 45 },
] as const;

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
    (shipment) => shipment.status === ShipmentStatus.COMPLETED,
  );
  const carrierRatings: Record<string, number[]> = {};
  const completedShipmentCounts: Record<string, number> = {};
  const earnedAmounts: Record<string, number> = {};
  let reviewCount = 0;
  let paymentCount = 0;
  let relationCount = 0;

  for (const shipment of completedShipments) {
    if (!shipment.carrierId || !shipment.customerId) {
      continue;
    }

    completedShipmentCounts[shipment.carrierId] = (completedShipmentCounts[shipment.carrierId] ?? 0) + 1;

    if (chance(0.8)) {
      const rating = randomWeightedFrom(
        REVIEW_RATING_WEIGHTS,
        (item) => item.weight,
      ).rating;
      const comments = REVIEW_COMMENTS[rating];

      await reviewRepo.save(reviewRepo.create({
        shipmentId: shipment.id,
        carrierId: shipment.carrierId,
        customerId: shipment.customerId,
        rating,
        comment: randomFrom(comments),
      }));
      reviewCount += 1;

      if (!carrierRatings[shipment.carrierId]) {
        carrierRatings[shipment.carrierId] = [];
      }
      carrierRatings[shipment.carrierId].push(rating);
    }

    const price = Number(shipment.price ?? randomInt(1500, 9000));
    const paymentStatus = randomWeightedFrom(
      PAYMENT_STATUS_WEIGHTS,
      (item) => item.weight,
    ).status;
    const paymentMethod = randomWeightedFrom(
      PAYMENT_METHOD_WEIGHTS,
      (item) => item.weight,
    ).method;
    const completedAt = paymentStatus === PaymentStatus.COMPLETED
      ? randomPastDateBetween(0, 20)
      : null;

    await paymentRepo.save(paymentRepo.create({
      shipmentId: shipment.id,
      customerId: shipment.customerId,
      amount: price,
      method: paymentMethod,
      status: paymentStatus,
      transactionId: `TXN-${Date.now()}-${randomInt(1000, 9999)}-${paymentCount + 1}`,
      note: paymentStatus === PaymentStatus.FAILED
        ? 'İşlem banka provizyonundan dönmedi.'
        : paymentStatus === PaymentStatus.PENDING
          ? 'İşlem onay bekliyor.'
          : 'Tahsilat başarıyla tamamlandı.',
      completedAt: completedAt ?? undefined,
    }));
    paymentCount += 1;

    if (paymentStatus === PaymentStatus.COMPLETED) {
      const netEarnings = Number((price * 0.9).toFixed(2));
      earnedAmounts[shipment.carrierId] = (earnedAmounts[shipment.carrierId] ?? 0) + netEarnings;

      try {
        await earningsRepo.save(earningsRepo.create({
          carrierId: shipment.carrierId,
          shipmentId: shipment.id,
          amount: netEarnings,
        }));
      } catch {
        // Ignore if entity constraints differ.
      }
    }

    try {
      const existingRelation = await relationRepo.findOne({
        where: {
          customerId: shipment.customerId,
          carrierId: shipment.carrierId,
        },
      });

      if (existingRelation) {
        existingRelation.completedJobsCount += 1;
        existingRelation.lastShipmentId = shipment.id;
        await relationRepo.save(existingRelation);
      } else {
        await relationRepo.save(relationRepo.create({
          customerId: shipment.customerId,
          carrierId: shipment.carrierId,
          firstShipmentId: shipment.id,
          lastShipmentId: shipment.id,
          completedJobsCount: 1,
          isSaved: chance(0.32),
          canInviteAgain: true,
        }));
        relationCount += 1;
      }
    } catch {
      // Ignore optional relation issues.
    }
  }

  for (const carrier of carriers) {
    const completedJobs = completedShipmentCounts[carrier.id] ?? 0;
    const ratings = carrierRatings[carrier.id] ?? [];
    const averageRating = ratings.length > 0 ? calcAvgRating(ratings) : carrier.rating;

    await carrierRepo.update(carrier.id, {
      rating: averageRating,
      completedShipments: completedJobs,
      balance: Number(carrier.balance ?? 0) + Number((earnedAmounts[carrier.id] ?? 0).toFixed(2)),
    });

    const stats = await statsRepo.findOne({ where: { carrierId: carrier.id } });
    if (stats) {
      stats.averageRating = averageRating;
      stats.totalReviews = ratings.length;
      stats.totalJobs = completedJobs;
      stats.totalEarnings = Number(
        Number(earnedAmounts[carrier.id] ?? stats.totalEarnings ?? 0).toFixed(2),
      );
      await statsRepo.save(stats);
    }
  }

  console.log(`  ✓ ${completedShipments.length} tamamlanan akış`);
  console.log(`     ${reviewCount} yorum, ${paymentCount} ödeme, ${relationCount} ilişki`);
}
