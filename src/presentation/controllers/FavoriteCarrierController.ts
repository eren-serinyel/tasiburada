import { Request, Response } from 'express';
import { FavoriteCarrierService } from '../../application/services/FavoriteCarrierService';

export class FavoriteCarrierController {
  private service = new FavoriteCarrierService();

  getFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user!.customerId!;
      const favorites = await this.service.getFavorites(customerId);
      res.json({ success: true, data: favorites });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Favoriler getirilirken hata oluştu.'
      });
    }
  };

  getFavoriteIds = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user!.customerId!;
      const ids = await this.service.getFavoriteIds(customerId);
      res.json({ success: true, data: ids });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Favori IDleri getirilirken hata oluştu.'
      });
    }
  };

  toggle = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user!.customerId!;
      const { carrierId } = req.params;
      const result = await this.service.toggle(customerId, carrierId);
      res.json({
        success: true,
        data: result,
        message: result.added ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.'
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Favori işlemi sırasında hata oluştu.'
      });
    }
  };
}
