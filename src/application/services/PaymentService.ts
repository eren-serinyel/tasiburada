import { AppDataSource } from '../../infrastructure/database/data-source';
import { Payment, PaymentStatus, PaymentMethod } from '../../domain/entities/Payment';
import { Offer, OfferStatus } from '../../domain/entities/Offer';
import { Shipment, ShipmentStatus } from '../../domain/entities/Shipment';
import { NotFoundError, ConflictError, ForbiddenError } from '../../domain/errors/AppError';
import { NotificationService } from './NotificationService';
import { PlatformPolicyService } from './PlatformPolicyService';

export class PaymentService {
  private paymentRepo = AppDataSource.getRepository(Payment);
  private notificationService = new NotificationService();
  private platformPolicy = new PlatformPolicyService();

  private maskCustomerForCarrier(payment: Payment): Payment {
    const sanitized = { ...payment } as any;

    if (payment.customer) {
      sanitized.customer = {
        firstName: payment.customer.firstName,
        lastName: `${payment.customer.lastName?.[0] ?? ''}***`,
      };
    }

    return sanitized;
  }

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

      const commission = await this.platformPolicy.computeCommission(Number(offer.price));

      const payment = transactionalEntityManager.create(Payment, {
        shipmentId: shipment.id,
        offerId: offer.id,
        customerId: data.customerId,
        carrierId: offer.carrierId,
        amount: commission.grossAmount,
        platformFee: commission.commissionAmount,
        carrierAmount: commission.netAmount,
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

  async getPaymentsByCarrier(carrierId: string): Promise<Payment[]> {
    const payments = await this.paymentRepo.find({
      where: { carrierId },
      relations: ['shipment', 'customer'],
      order: { createdAt: 'DESC' },
    });

    return payments.map(payment => this.maskCustomerForCarrier(payment));
  }

  async getPaymentByShipment(shipmentId: string, customerId?: string): Promise<Payment | null> {
    const payment = await this.paymentRepo.findOne({
      where: { shipmentId },
      relations: ['customer', 'shipment']
    });

    if (payment && customerId && payment.customerId !== customerId) {
      throw new ForbiddenError('Bu odeme kaydina erisim yetkiniz yok.');
    }

    return payment;
  }

  async confirmRelease(paymentId: string, customerId: string): Promise<Payment> {
    const releasedPayment = await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      const payment = await transactionalEntityManager.findOne(Payment, {
        where: { id: paymentId },
        relations: ['shipment'],
      });

      if (!payment) {
        throw new NotFoundError('Odeme bulunamadi.');
      }

      if (payment.customerId !== customerId) {
        throw new ForbiddenError('Bu odemeyi onaylama yetkiniz yok.');
      }

      if (payment.status === PaymentStatus.COMPLETED) {
        return payment;
      }

      const releasableStatuses = [
        PaymentStatus.PENDING,
        PaymentStatus.AUTHORIZED,
        PaymentStatus.CAPTURED,
      ];

      if (!releasableStatuses.includes(payment.status)) {
        throw new ConflictError('Bu odeme mevcut durumunda tamamlanamaz.');
      }

      const shipment = payment.shipment || await transactionalEntityManager.findOne(Shipment, {
        where: { id: payment.shipmentId },
      });

      if (!shipment) {
        throw new NotFoundError('Tasima bulunamadi.');
      }

      if (shipment.status !== ShipmentStatus.COMPLETED) {
        throw new ConflictError('Odeme yalnizca tasima tamamlandiktan sonra onaylanabilir.');
      }

      payment.status = PaymentStatus.COMPLETED;
      payment.completedAt = new Date();

      return transactionalEntityManager.save(payment);
    });

    if (releasedPayment.carrierId) {
      try {
        await this.notificationService.createFromEvent('carrier.payment_released', {
          recipientUserId: releasedPayment.carrierId,
          entityId: releasedPayment.shipmentId,
          paymentId: releasedPayment.id,
          customerId: releasedPayment.customerId,
          amount: Number(releasedPayment.carrierAmount || releasedPayment.amount || 0),
          currency: releasedPayment.currency || 'TRY',
        });
      } catch {
        // Notification failure must not roll back a completed payment release.
      }
    }

    return releasedPayment;
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
