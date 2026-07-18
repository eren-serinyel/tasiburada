import { Request, Response } from 'express';
import { CarrierDetailService } from '../../application/services/carrier/CarrierDetailService';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceLoadType';

export class CarrierDetailController {
  private detailService = new CarrierDetailService();

  getDetail = async (req: Request, res: Response) => {
    try {
      const { carrierId } = req.params;
      if (!carrierId) {
        return res.status(400).json({ success: false, message: 'Nakliyeci kimliği zorunludur.' });
      }

      const rawLoadType = typeof req.query.loadType === 'string' ? req.query.loadType : undefined;
      const loadType = rawLoadType?.trim().toUpperCase() as ExtraServiceLoadType | undefined;
      if (rawLoadType && !Object.values(ExtraServiceLoadType).includes(loadType as ExtraServiceLoadType)) {
        return res.status(400).json({ success: false, message: 'loadType geçersiz.' });
      }

      const viewerCustomerId = req.user?.type === 'customer'
        ? req.user.customerId
        : undefined;
      const detail = await this.detailService.getCarrierDetail(
        carrierId,
        loadType,
        viewerCustomerId,
      );
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
