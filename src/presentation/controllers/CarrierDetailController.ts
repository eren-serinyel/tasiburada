import { Request, Response } from 'express';
import { CarrierDetailService } from '../../application/services/carrier/CarrierDetailService';

export class CarrierDetailController {
  private detailService = new CarrierDetailService();

  getDetail = async (req: Request, res: Response) => {
    try {
      const { carrierId } = req.params;
      if (!carrierId) {
        return res.status(400).json({ success: false, message: 'Nakliyeci kimliği zorunludur.' });
      }

      const detail = await this.detailService.getCarrierDetail(carrierId);
      if (!detail) {
        return res.status(404).json({ success: false, message: 'Nakliyeci bulunamadı.' });
      }

      return res.status(200).json({ success: true, data: detail });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error?.message || 'Nakliyeci detayı alınamadı.'
      });
    }
  };
}
