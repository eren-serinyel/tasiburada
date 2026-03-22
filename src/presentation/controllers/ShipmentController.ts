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
      const shipment = await this.shipmentService.getShipmentById(id);

      if (!shipment) {
        res.status(404).json({
          success: false,
          message: 'Taşıma talebi bulunamadı.'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: shipment
      });
    } catch (error: any) {
      res.status(500).json({
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
}
