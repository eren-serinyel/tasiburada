import { Request, Response } from 'express';
import { MessageService } from '../../application/services/MessageService';

export class MessageController {
  private messageService = new MessageService();

  sendMessage = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.type || !user?.customerId && !user?.carrierId) {
        return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli.' });
      }

      const senderType = user.type as 'customer' | 'carrier';
      const senderId = senderType === 'customer' ? user.customerId : user.carrierId;

      const message = await this.messageService.sendMessage(senderType, senderId, {
        shipmentId: req.body.shipmentId,
        content: req.body.content,
      });

      return res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      const status = error?.statusCode || 500;
      return res.status(status).json({ success: false, message: error?.message || 'Mesaj gönderilemedi.' });
    }
  };

  getMessages = async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!user?.type || !user?.customerId && !user?.carrierId) {
        return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli.' });
      }

      const viewerType = user.type as 'customer' | 'carrier';
      const viewerId = viewerType === 'customer' ? user.customerId : user.carrierId;
      const { shipmentId } = req.params;

      const messages = await this.messageService.getMessages(viewerType, viewerId, shipmentId);
      return res.status(200).json({ success: true, data: messages });
    } catch (error: any) {
      const status = error?.statusCode || 500;
      return res.status(status).json({ success: false, message: error?.message || 'Mesajlar alınamadı.' });
    }
  };
}
