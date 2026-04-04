import { Request, Response } from 'express';
import { PaymentService } from '../../application/services/PaymentService';
import { PaymentMethod } from '../../domain/entities/Payment';

const paymentService = new PaymentService();

export class PaymentController {
  static async createPayment(req: Request, res: Response) {
    try {
      const { shipmentId, amount, method, note } = req.body;
      const customerId = req.user?.customerId;

      if (!shipmentId || !amount) {
        return res.status(400).json({ success: false, message: 'shipmentId ve amount zorunlu' });
      }

      const payment = await paymentService.createPayment({
        shipmentId,
        customerId: customerId!,
        amount: Number(amount),
        method: method || PaymentMethod.CREDIT_CARD,
        note
      });

      return res.status(201).json({ success: true, data: payment });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
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

  static async getPaymentByShipment(req: Request, res: Response) {
    try {
      const { shipmentId } = req.params;
      const payment = await paymentService.getPaymentByShipment(shipmentId);
      if (!payment) return res.status(404).json({ success: false, message: 'Ödeme bulunamadı' });
      return res.json({ success: true, data: payment });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
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
