import { Request, Response } from 'express';
import { PaymentService } from '../../application/services/PaymentService';
import { PaymentMethod } from '../../domain/entities/Payment';

const paymentService = new PaymentService();

const normalizePaymentMethod = (method: unknown): PaymentMethod => {
  if (typeof method !== 'string') return PaymentMethod.CREDIT_CARD;
  const normalized = method.trim().toLowerCase();

  if (normalized === 'credit_card' || normalized === 'card') return PaymentMethod.CREDIT_CARD;
  if (normalized === 'bank_transfer' || normalized === 'transfer') return PaymentMethod.BANK_TRANSFER;
  if (normalized === 'cash') return PaymentMethod.CASH;

  return PaymentMethod.CREDIT_CARD;
};

export class PaymentController {
  static async createPayment(req: Request, res: Response) {
    try {
      const { offerId, method, note } = req.body;
      const customerId = req.user?.customerId;

      if (!offerId) {
        return res.status(400).json({ success: false, message: 'offerId zorunlu' });
      }

      const payment = await paymentService.createPayment({
        offerId,
        customerId: customerId!,
        method: normalizePaymentMethod(method),
        note,
      });

      return res.status(201).json({ success: true, data: payment });
    } catch (err: any) {
      const statusCode = err?.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: err.message });
    }
  }

  static async getMyPayments(req: Request, res: Response) {
    try {
      const customerId = req.user?.customerId;
      const payments = await paymentService.getPaymentsByCustomer(customerId!);
      return res.json({ success: true, data: payments });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getMyCarrierPayments(req: Request, res: Response) {
    try {
      const carrierId = req.user?.carrierId;
      const payments = await paymentService.getPaymentsByCarrier(carrierId!);
      return res.json({ success: true, data: payments });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getPaymentByShipment(req: Request, res: Response) {
    try {
      const { shipmentId } = req.params;
      const customerId = req.user?.customerId;
      const payment = await paymentService.getPaymentByShipment(shipmentId, customerId);
      if (!payment) return res.status(404).json({ success: false, message: 'Odeme bulunamadi' });
      return res.json({ success: true, data: payment });
    } catch (err: any) {
      const statusCode = err?.statusCode || 500;
      return res.status(statusCode).json({ success: false, message: err.message });
    }
  }

  static async confirmRelease(req: Request, res: Response) {
    try {
      const { paymentId } = req.params;
      const customerId = req.user?.customerId;

      if (!paymentId) {
        return res.status(400).json({ success: false, message: 'paymentId zorunlu' });
      }

      const payment = await paymentService.confirmRelease(paymentId, customerId!);
      return res.json({
        success: true,
        message: 'Odeme teslimat onayi ile tamamlandi.',
        data: payment,
      });
    } catch (err: any) {
      const statusCode = err?.statusCode || 400;
      return res.status(statusCode).json({ success: false, message: err.message });
    }
  }

  static async getAllPayments(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await paymentService.getAllPayments(page, limit);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}
