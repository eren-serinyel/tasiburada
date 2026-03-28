import { Request, Response } from 'express';
import { OfferService } from '../../application/services/OfferService';

export class OfferController {
  private offerService = new OfferService();

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const offer = await this.offerService.createOffer(carrierId, req.body);
      res.status(201).json({
        success: true,
        message: 'Teklif oluşturuldu.',
        data: offer
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Teklif oluşturulurken hata oluştu.'
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const offer = await this.offerService.getOfferById(id, user);
      res.status(200).json({
        success: true,
        data: offer
      });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadı')) {
        statusCode = 404;
      } else if (error.message?.includes('yetkiniz yok')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Teklif alınırken hata oluştu.'
      });
    }
  };

  accept = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const { id } = req.params;
      const offer = await this.offerService.acceptOffer(customerId, id);
      res.status(200).json({
        success: true,
        message: 'Teklif kabul edildi.',
        data: offer
      });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadı')) {
        statusCode = 404;
      } else if (error.message?.includes('yetkiniz yok')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Teklif kabul edilirken hata oluştu.'
      });
    }
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const { id } = req.params;
      const offer = await this.offerService.rejectOffer(customerId, id);
      res.status(200).json({
        success: true,
        message: 'Teklif reddedildi.',
        data: offer
      });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadı')) {
        statusCode = 404;
      } else if (error.message?.includes('yetkiniz yok')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Teklif reddedilirken hata oluştu.'
      });
    }
  };

  getMyCarrierOffers = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const offers = await this.offerService.getCarrierOffers(carrierId);
      res.status(200).json({
        success: true,
        data: offers
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Taşıyıcı teklifleri alınırken hata oluştu.'
      });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const { id } = req.params;
      const offer = await this.offerService.updateOffer(carrierId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Teklif güncellendi.',
        data: offer
      });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadı')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok')) statusCode = 403;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Teklif güncellenirken hata oluştu.'
      });
    }
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const { id } = req.params;
      const offer = await this.offerService.withdrawOffer(carrierId, id);
      res.status(200).json({
        success: true,
        message: 'Teklif geri çekildi.',
        data: offer
      });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadı')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok')) statusCode = 403;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Teklif geri çekilirken hata oluştu.'
      });
    }
  };
}
