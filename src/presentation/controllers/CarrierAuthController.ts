import { Request, Response } from 'express';
import { CarrierAuthService } from '../../application/services/carrier/CarrierAuthService';
import { CarrierProfileQueryService } from '../../application/services/carrier/CarrierProfileQueryService';

export class CarrierAuthController {
  private authService = new CarrierAuthService();
  private profileQueryService = new CarrierProfileQueryService();

  register = async (req: Request, res: Response) => {
    try {
      const { carrier, token, profileStatus } = await this.authService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Kayıt başarılı, profilinizi tamamlayabilirsiniz.',
        data: { carrier: this.toResponse(carrier), token, profileStatus }
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Kayıt sırasında hata oluştu.' });
    }
  };

  login = async (req: Request, res: Response) => {
    try {
  const { carrier, token } = await this.authService.login(req.body);
  res.status(200).json({ success: true, message: 'Giriş başarılı', data: { carrier: this.toResponse(carrier), token } });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message || 'Giriş başarısız.' });
    }
  };

  me = async (req: Request, res: Response) => {
    try {
      if (!req.carrierId) {
        return res.status(401).json({ success: false, message: 'Kimlik doğrulaması gerekli.' });
      }
  const overview = await this.profileQueryService.getCarrierOverview(req.carrierId);
      res.status(200).json({ success: true, data: overview });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || 'Profil bilgileri alınamadı.' });
    }
  };

  private toResponse(carrier: any) {
    return {
      id: carrier.id,
      companyName: carrier.companyName,
      contactName: carrier.contactName,
      email: carrier.email,
      phone: carrier.phone,
      taxNumber: carrier.taxNumber,
      pictureUrl: carrier.pictureUrl ?? null,
      profileCompletion: carrier.profileCompletion,
      isActive: carrier.isActive,
      createdAt: carrier.createdAt,
      updatedAt: carrier.updatedAt
    };
  }
}
