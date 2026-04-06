import { Request, Response } from 'express';
import { ReviewService } from '../../application/services/ReviewService';

export class ReviewController {
  private reviewService = new ReviewService();

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erisim.'
        });
        return;
      }

      const review = await this.reviewService.createReview(customerId, req.body);
      res.status(201).json({
        success: true,
        message: 'Yorum olusturuldu.',
        data: review
      });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadi')) {
        statusCode = 404;
      } else if (error.message?.includes('yetkiniz yok')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Yorum olusturulurken hata olustu.'
      });
    }
  };

  getShipmentReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const shipmentId = req.params.id;
      const reviews = await this.reviewService.getShipmentReviews(shipmentId);
      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Yorumlar alinirken hata olustu.'
      });
    }
  };

  getMyCustomerReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erisim.'
        });
        return;
      }

      const reviews = await this.reviewService.getCustomerReviews(customerId);
      res.status(200).json({
        success: true,
        data: reviews
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Musteri yorumlari alinirken hata olustu.'
      });
    }
  };

  createByCarrierId = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erisim.' });
        return;
      }
      const { carrierId, rating, comment } = req.body;
      if (!carrierId) {
        res.status(400).json({ success: false, message: 'carrierId zorunludur.' });
        return;
      }
      const review = await this.reviewService.createReviewByCarrierId(customerId, carrierId, rating, comment);
      res.status(201).json({ success: true, message: 'Yorum olusturuldu.', data: review });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadi') || error.message?.includes('bulunamad')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok')) statusCode = 403;
      res.status(statusCode).json({ success: false, message: error.message || 'Yorum olusturulurken hata olustu.' });
    }
  };

  getCarrierReviews = async (req: Request, res: Response): Promise<void> => {
    try {
      const { carrierId } = req.params;
      const reviews = await this.reviewService.getCarrierReviews(carrierId);
      res.status(200).json({ success: true, data: reviews });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Yorumlar alinirken hata olustu.' });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erisim.' });
        return;
      }
      const reviewId = req.params.id;
      const { rating, comment } = req.body;

      const review = await this.reviewService.updateReview(reviewId, customerId, { rating, comment });
      res.status(200).json({ success: true, message: 'Yorum guncellendi.', data: review });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamad')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok')) statusCode = 403;
      res.status(statusCode).json({ success: false, message: error.message || 'Yorum guncellenirken hata olustu.' });
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erisim.' });
        return;
      }
      const reviewId = req.params.id;
      await this.reviewService.deleteReview(reviewId, customerId);
      res.status(200).json({ success: true, message: 'Yorum silindi.' });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamad')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok')) statusCode = 403;
      res.status(statusCode).json({ success: false, message: error.message || 'Yorum silinirken hata olustu.' });
    }
  };
}
