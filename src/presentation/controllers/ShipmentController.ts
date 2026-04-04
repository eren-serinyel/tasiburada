import { Request, Response } from 'express';
import { ShipmentService } from '../../application/services/ShipmentService';

export class ShipmentController {
  private shipmentService = new ShipmentService();

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const shipment = await this.shipmentService.createShipment(customerId, req.body);
      res.status(201).json({
        success: true,
        message: 'Taşıma talebi oluşturuldu.',
        data: shipment
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Taşıma talebi oluşturulurken hata oluştu.'
      });
    }
  };

  getMyShipments = async (req: Request, res: Response): Promise<void> => {
    try {
      const customerId = req.user?.customerId;
      if (!customerId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const shipments = await this.shipmentService.getMyShipments(customerId);
      res.status(200).json({
        success: true,
        data: shipments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Taşıma talepleri alınırken hata oluştu.'
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.customerId || req.user?.carrierId || req.user?.adminId;
      const userType = req.user?.type;

      if (!userId || !userType) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const shipment = await this.shipmentService.getShipmentById(id, userId, userType);

      res.status(200).json({
        success: true,
        data: shipment
      });
    } catch (error: any) {
      let statusCode = 500;
      if (error.message?.includes('bulunamadı')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok') || error.message?.includes('Yetkisiz')) statusCode = 403;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Taşıma talebi alınırken hata oluştu.'
      });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
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
      const updatedShipment = await this.shipmentService.updateShipment(customerId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Taşıma talebi güncellendi.',
        data: updatedShipment
      });
    } catch (error: any) {
      const statusCode = error.message?.includes('bulunamadı') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Taşıma talebi güncellenirken hata oluştu.'
      });
    }
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
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
      const cancelledShipment = await this.shipmentService.cancelShipment(customerId, id);
      res.status(200).json({
        success: true,
        message: 'Taşıma talebi iptal edildi.',
        data: cancelledShipment
      });
    } catch (error: any) {
      const statusCode = error.message?.includes('bulunamadı') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Taşıma talebi iptal edilirken hata oluştu.'
      });
    }
  };

  getPending = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const shipments = await this.shipmentService.getPendingShipmentsForCarrier(carrierId);
      res.status(200).json({
        success: true,
        data: shipments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Pending shipmentlar alınırken hata oluştu.'
      });
    }
  };

  start = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const { id } = req.params;
      const startedShipment = await this.shipmentService.startShipmentByCarrier(carrierId, id);
      res.status(200).json({
        success: true,
        message: 'Taşıma başlatıldı.',
        data: startedShipment
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
        message: error.message || 'Taşıma başlatılırken hata oluştu.'
      });
    }
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.user?.carrierId;
      if (!carrierId) {
        res.status(401).json({
          success: false,
          message: 'Yetkisiz erişim.'
        });
        return;
      }

      const { id } = req.params;
      const completedShipment = await this.shipmentService.completeShipmentByCarrier(carrierId, id);
      res.status(200).json({
        success: true,
        message: 'Taşıma teslim edildi olarak işaretlendi.',
        data: completedShipment
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
        message: error.message || 'Taşıma tamamlanırken hata oluştu.'
      });
    }
  };

  searchShipments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { origin, destination, status, loadType, page, limit } = req.query;
      const result = await this.shipmentService.searchShipments({
        origin: origin as string,
        destination: destination as string,
        status: status as string,
        loadType: loadType as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Arama sırasında hata oluştu.' });
    }
  };

  assignCarrier = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { carrierId } = req.body;
      const customerId = req.user?.customerId;

      if (!customerId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      if (!carrierId) {
        res.status(400).json({ success: false, message: 'carrierId zorunlu' });
        return;
      }
      const shipment = await this.shipmentService.assignCarrier(id, carrierId, customerId);
      res.status(200).json({ success: true, data: shipment });
    } catch (error: any) {
      let statusCode = 400;
      if (error.message?.includes('bulunamadı')) statusCode = 404;
      else if (error.message?.includes('yetkiniz yok') || error.message?.includes('Yetkisiz')) statusCode = 403;
      res.status(statusCode).json({ success: false, message: error.message || 'Nakliyeci atanamadı.' });
    }
  };

}
