import { Request, Response } from 'express';
import { NotificationService } from '../../application/services/NotificationService';

export class NotificationController {
  private notificationService = new NotificationService();

  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.customerId || req.user?.carrierId;
      const userType = req.user?.type;

      if (!userId || (userType !== 'customer' && userType !== 'carrier')) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const notifications = await this.notificationService.getNotifications(userId, userType);
      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Bildirimler alınırken hata oluştu.'
      });
    }
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.notificationService.markRead(req.params.id);
      res.status(200).json({ success: true, message: 'Bildirim okundu olarak işaretlendi.' });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Bildirim güncellenemedi.'
      });
    }
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.customerId || req.user?.carrierId;
      const userType = req.user?.type;

      if (!userId || (userType !== 'customer' && userType !== 'carrier')) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      await this.notificationService.markAllRead(userId, userType);
      res.status(200).json({ success: true, message: 'Tüm bildirimler okundu olarak işaretlendi.' });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Bildirimler güncellenemedi.'
      });
    }
  };

  getUnreadCount = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.customerId || req.user?.carrierId;
      const userType = req.user?.type;

      if (!userId || (userType !== 'customer' && userType !== 'carrier')) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const count = await this.notificationService.getUnreadCount(userId, userType);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Okunmamış bildirim sayısı alınamadı.'
      });
    }
  };
}
