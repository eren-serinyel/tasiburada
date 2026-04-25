import { Request, Response } from 'express';
import { CarrierCapabilityService } from '../../application/services/carrier/CarrierCapabilityService';
import { UpdateCarrierCapabilityPayload } from '../../application/dto/CarrierCapabilityDTO';

/**
 * Controller: Carrier capability management endpoints
 * - Carrier read own capabilities
 * - Admin read/update carrier capabilities
 */
export class CarrierCapabilityController {
  private service = new CarrierCapabilityService();

  /**
   * GET /api/v1/carriers/me/capabilities
   * Carrier reads own capabilities
   */
  getMyCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const carrierId = req.carrierId;
      if (!carrierId) {
        res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli.' });
        return;
      }

      const capabilities = await this.service.getCarrierCapabilities(carrierId);
      res.status(200).json({ success: true, data: capabilities });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Yetenek bilgisi alınamadı.' });
    }
  };

  /**
   * GET /api/v1/admin/carriers/:carrierId/capabilities
   * Admin reads carrier capabilities
   */
  getCarrierCapabilities = async (req: Request, res: Response): Promise<void> => {
    try {
      const { carrierId } = req.params;
      if (!carrierId) {
        res.status(400).json({ success: false, message: 'Nakliyeci kimliği zorunludur.' });
        return;
      }

      const capabilities = await this.service.getCarrierCapabilities(carrierId);
      res.status(200).json({ success: true, data: capabilities });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Yetenek bilgisi alınamadı.' });
    }
  };

  /**
   * PUT /api/v1/admin/carriers/:carrierId/capabilities
   * Admin updates carrier capabilities
   * 
   * Payload examples:
   * - Add load type: { action: 'add_load_type', loadType: 'HOME' }
   * - Remove load type: { action: 'remove_load_type', loadType: 'OFFICE' }
   * - Add extra service: { action: 'add_extra_service', extraServiceId: 'xxx', loadType: 'HOME', priceMode: 'FIXED', basePrice: 100 }
   * - Remove extra service: { action: 'remove_extra_service', extraServiceId: 'xxx', loadType: 'HOME' }
   * - Toggle active: { action: 'toggle_active', loadType: 'HOME', isActive: false }
   */
  updateCarrierCapability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { carrierId } = req.params;
      const payload: UpdateCarrierCapabilityPayload = req.body;

      if (!carrierId) {
        res.status(400).json({ success: false, message: 'Nakliyeci kimliği zorunludur.' });
        return;
      }

      if (!payload.action) {
        res.status(400).json({ success: false, message: 'Action zorunludur.' });
        return;
      }

      const result = await this.service.updateCapability(carrierId, payload);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Yetenek güncellemesi başarısız.',
      });
    }
  };
}
