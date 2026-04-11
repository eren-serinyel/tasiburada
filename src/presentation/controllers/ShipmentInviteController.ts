import { Request, Response } from 'express';
import { ShipmentInviteService } from '../../application/services/ShipmentInviteService';

export class ShipmentInviteController {
  private service = new ShipmentInviteService();

  invite = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user!.customerId!;
      const { id: shipmentId, carrierId } = req.params;
      const invite = await this.service.invite(customerId, shipmentId, carrierId);
      res.json({
        success: true,
        message: 'Davet gönderildi',
        data: invite
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Davet gönderilemedi.'
      });
    }
  };

  getCarrierInvites = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user!.carrierId!;
      const invites = await this.service.getCarrierInvites(carrierId);
      res.json({ success: true, data: invites });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Davetler getirilemedi.'
      });
    }
  };
}
