import { Request, Response, NextFunction } from 'express';
import { CarrierProfileStatusService } from '../../application/services/carrier/CarrierProfileStatusService';

const profileStatusService = new CarrierProfileStatusService();

export const checkCarrierProfileCompletion = (minPercent: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.carrierId) {
        return res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli.' });
      }
      const status = await profileStatusService.updateProfileCompletion(req.carrierId);
      if ((status.overallPercentage ?? 0) < minPercent) {
        return res.status(403).json({
          success: false,
          message: 'Profilinizi tamamlamadan bu işlemi yapamazsınız.'
        });
      }
      next();
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || 'Profil doğrulama hatası' });
    }
  };
};
