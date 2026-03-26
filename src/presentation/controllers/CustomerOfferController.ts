import { Request, Response } from 'express';
import { CustomerOfferService } from '../../application/services/CustomerOfferService';

export class CustomerOfferController {
  private customerOfferService = new CustomerOfferService();

  getMyOffers = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const offers = await this.customerOfferService.getMyOffers(customerId);
      res.status(200).json({
        success: true,
        data: offers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Müşteri teklifleri alınırken hata oluştu.'
      });
    }
  };
}
