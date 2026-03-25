import { Request, Response } from 'express';
import { AdminAuthService } from '../../application/services/AdminAuthService';

export class AdminAuthController {
  private adminAuthService: AdminAuthService;

  constructor() {
    this.adminAuthService = new AdminAuthService();
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ success: false, message: 'E-posta ve şifre zorunludur.' });
        return;
      }

      const result = await this.adminAuthService.login(email, password);
      res.status(200).json({ success: true, message: 'Giriş başarılı.', data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message || 'Giriş yapılırken hata oluştu.' });
    }
  };

  me = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = req.user?.adminId;
      if (!adminId) {
        res.status(401).json({ success: false, message: 'Yetkisiz erişim.' });
        return;
      }

      const profile = await this.adminAuthService.getProfile(adminId);
      res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message || 'Profil bulunamadı.' });
    }
  };
}
