import { Request, Response } from 'express';
import { NotificationService } from '../../application/services/NotificationService';

export class NotificationController {
  private notificationService = new NotificationService();

  private resolveUserScope(req: Request): { userId: string; userType: 'customer' | 'carrier' | 'admin' } | null {
    const userType = req.user?.type;
    const userId = req.user?.customerId || req.user?.carrierId || req.user?.adminId;

    if (!userId || (userType !== 'customer' && userType !== 'carrier' && userType !== 'admin')) {
      return null;
    }

    return { userId, userType };
  }

  getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = this.resolveUserScope(req);

      if (!scope) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const type = typeof req.query.type === 'string' ? req.query.type : undefined;
      const severity = typeof req.query.severity === 'string' ? req.query.severity : undefined;

      const result = await this.notificationService.listForRecipient(scope.userId, scope.userType, {
        page,
        limit,
        status,
        type,
        severity,
      });

      const unreadCount = await this.notificationService.getUnreadCount(scope.userId, scope.userType);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
        unreadCount,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Bildirimler alınırken hata oluştu.'
      });
    }
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const notificationId = req.params.id;
      const scope = this.resolveUserScope(req);

      if (!scope) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const notification = await this.notificationService.findById(notificationId);

      if (!notification) {
        res.status(404).json({ success: false, message: 'Bildirim bulunamadı.' });
        return;
      }

      // Ownership kontrolü: bildirim bu kullanıcıya ait olmalı
      const ownerId = notification.recipientUserId || notification.userId;
      const ownerRole = notification.recipientRole || notification.userType;
      if (ownerId !== scope.userId || ownerRole !== scope.userType) {
        res.status(403).json({ success: false, message: 'Bu bildirime erişim yetkiniz yok.' });
        return;
      }

      await this.notificationService.markRead(notificationId, scope.userId, scope.userType);
      res.status(200).json({ success: true, message: 'Bildirim okundu olarak işaretlendi.' });
    } catch (error: any) {
      if (error?.message === 'Bu bildirime erişim yetkiniz yok.') {
        res.status(403).json({ success: false, message: error.message });
        return;
      }
      res.status(400).json({
        success: false,
        message: error.message || 'Bildirim güncellenemedi.'
      });
    }
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const scope = this.resolveUserScope(req);

      if (!scope) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      await this.notificationService.markAllRead(scope.userId, scope.userType);
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
      const scope = this.resolveUserScope(req);

      if (!scope) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const count = await this.notificationService.getUnreadCount(scope.userId, scope.userType);
      res.status(200).json({ success: true, data: { unreadCount: count } });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Okunmamış bildirim sayısı alınamadı.'
      });
    }
  };
}
