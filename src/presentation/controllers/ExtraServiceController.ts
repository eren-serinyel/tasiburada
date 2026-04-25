import { Request, Response } from 'express';
import { ExtraServiceLoadType } from '../../domain/entities/ExtraServiceApplicability';
import { ExtraServiceService } from '../../application/services/extra-services/ExtraServiceService';

const VALID_LOAD_TYPES = new Set(Object.values(ExtraServiceLoadType));

export class ExtraServiceController {
  private extraServiceService = new ExtraServiceService();

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const rawLoadType = typeof req.query.loadType === 'string' ? req.query.loadType.trim().toUpperCase() : '';
      const loadType = rawLoadType && VALID_LOAD_TYPES.has(rawLoadType as ExtraServiceLoadType)
        ? (rawLoadType as ExtraServiceLoadType)
        : null;

      if (rawLoadType && !loadType) {
        res.status(400).json({
          success: false,
          message: `Geçersiz loadType. Desteklenen değerler: ${Array.from(VALID_LOAD_TYPES).join(', ')}`,
        });
        return;
      }

      const data = await this.extraServiceService.listActiveExtraServices(loadType);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Ek hizmetler alınamadı.',
      });
    }
  };
}
