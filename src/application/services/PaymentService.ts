import { AppDataSource } from '../../infrastructure/database/data-source';
import { Payment, PaymentStatus, PaymentMethod } from '../../domain/entities/Payment';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { ShipmentStatus } from '../../domain/entities/Shipment';
import { NotFoundError, ConflictError, ForbiddenError } from '../../domain/errors/AppError';

const DEFAULT_COMMISSION_RATE = 0.1;

const roundToTwo = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

export class PaymentService {
  private paymentRepo = AppDataSource.getRepository(Payment);

  async createPayment(data: {
    offerId: string;
    customerId: string;
    method: PaymentMethod;
    note?: string;
  }): Promise<Payment> {
    return await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      const offer = await transactionalEntityManager.findOne(Offer, {
        where: { id: data.offerId },
        relations: ['shipment'],
      });

      if (!offer) {
        throw new NotFoundError('Teklif bulunamadı.');
      }

      const shipment = offer.shipment;
      if (!shipment) {
        throw new NotFoundError('Taşıma bulunamadı.');
      }

      if (offer.status !== OfferStatus.ACCEPTED) {
        throw new ConflictError('Ödeme yalnızca kabul edilmiş teklifler için oluşturulabilir.');
      }

      if (shipment.status !== ShipmentStatus.MATCHED) {
        throw new ConflictError('Ödeme yalnızca eşleştirilmiş taşıma için oluşturulabilir.');
      }

      if (shipment.customerId !== data.customerId) {
        throw new ForbiddenError('Bu teklif için ödeme oluşturma yetkiniz yok.');
      }

      const existingPayment = await transactionalEntityManager.findOne(Payment, {
        where: [
          { offerId: data.offerId, status: PaymentStatus.PENDING },
          { offerId: data.offerId, status: PaymentStatus.AUTHORIZED },
          { offerId: data.offerId, status: PaymentStatus.CAPTURED },
          { offerId: data.offerId, status: PaymentStatus.COMPLETED },
        ],
      });

      if (existingPayment) {
        throw new ConflictError('Bu teklif için aktif ödeme kaydı zaten mevcut.');
      }

      const commissionRateRaw = Number(process.env.PLATFORM_COMMISSION_RATE);
      const commissionRate = Number.isFinite(commissionRateRaw) ? commissionRateRaw : DEFAULT_COMMISSION_RATE;

      const amount = roundToTwo(Number(offer.price));
      const platformFee = roundToTwo(amount * commissionRate);
      const carrierAmount = roundToTwo(amount - platformFee);

      const payment = transactionalEntityManager.create(Payment, {
        shipmentId: shipment.id,
        offerId: offer.id,
        customerId: data.customerId,
        carrierId: offer.carrierId,
        amount,
        platformFee,
        carrierAmount,
        currency: 'TRY',
        provider: 'manual',
        method: data.method,
        note: data.note,
        status: PaymentStatus.PENDING,
        completedAt: null,
      });

      const savedPayment = await transactionalEntityManager.save(payment);
      return savedPayment;
    });
  }

  async getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
    return await this.paymentRepo.find({
      where: { customerId },
      relations: ['shipment'],
      order: { createdAt: 'DESC' }
    });
  }

  async getPaymentByShipment(shipmentId: string): Promise<Payment | null> {
    return await this.paymentRepo.findOne({
      where: { shipmentId },
      relations: ['customer', 'shipment']
    });
  }

  async getAllPayments(page: number = 1, limit: number = 20): Promise<{ payments: Payment[], total: number }> {
    const [payments, total] = await this.paymentRepo.findAndCount({
      relations: ['customer', 'shipment'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit
    });
    return { payments, total };
  }
}
