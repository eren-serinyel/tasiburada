import { AppDataSource } from '../../infrastructure/database/data-source';
import { Payment, PaymentStatus, PaymentMethod } from '../../domain/entities/Payment';
import { Shipment } from '../../domain/entities/Shipment';

export class PaymentService {
  private paymentRepo = AppDataSource.getRepository(Payment);
  private shipmentRepo = AppDataSource.getRepository(Shipment);

  async createPayment(data: {
    shipmentId: string;
    customerId: string;
    amount: number;
    method: PaymentMethod;
    note?: string;
  }): Promise<Payment> {
    const shipment = await this.shipmentRepo.findOne({ where: { id: data.shipmentId } });
    if (!shipment) throw new Error('Taşıma bulunamadı');

    const payment = this.paymentRepo.create({
      ...data,
      status: PaymentStatus.COMPLETED,
      completedAt: new Date(),
      transactionId: 'TXN-' + Date.now()
    });

    return await this.paymentRepo.save(payment);
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
