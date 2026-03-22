import { Request, Response } from 'express';
import { CarrierReviewService } from '../../application/services/carrier/CarrierReviewService';

export class CarrierReviewController {
  private reviewService = new CarrierReviewService();

  getMyReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const reviews = await this.reviewService.getReviewsByCarrierId(carrierId);
      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Nakliyeci yorumları alınırken hata oluştu.'
      });
    }
  };
}
