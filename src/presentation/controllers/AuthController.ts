import { Request, Response } from 'express';
import { AuthService } from '../../application/services/AuthService';

export class AuthController {
  private authService = new AuthService();

  requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, userType } = req.body;
      if (!email || !userType) {
        res.status(400).json({ success: false, message: 'email ve userType alanları zorunludur.' });
        return;
      }
      if (userType !== 'customer' && userType !== 'carrier') {
        res.status(400).json({ success: false, message: 'userType "customer" veya "carrier" olmalıdır.' });
        return;
      }

      const result = await this.authService.requestPasswordReset(email, userType);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword, userType } = req.body;
      if (!token || !newPassword || !userType) {
        res.status(400).json({ success: false, message: 'token, newPassword ve userType alanları zorunludur.' });
        return;
      }
      if (userType !== 'customer' && userType !== 'carrier') {
        res.status(400).json({ success: false, message: 'userType "customer" veya "carrier" olmalıdır.' });
        return;
      }

      const result = await this.authService.resetPassword(token, newPassword, userType);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, userType } = req.body;
      if (!token || !userType) {
        res.status(400).json({ success: false, message: 'token ve userType alanları zorunludur.' });
        return;
      }
      if (userType !== 'customer' && userType !== 'carrier') {
        res.status(400).json({ success: false, message: 'userType "customer" veya "carrier" olmalıdır.' });
        return;
      }

      const result = await this.authService.verifyEmail(token, userType);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  resendVerification = async (req: Request, res: Response): Promise<void> => {
    try {
      const email = req.query.email as string;
      const userType = req.query.userType as string;
      if (!email || !userType) {
        res.status(400).json({ success: false, message: 'email ve userType query parametreleri zorunludur.' });
        return;
      }
      if (userType !== 'customer' && userType !== 'carrier') {
        res.status(400).json({ success: false, message: 'userType "customer" veya "carrier" olmalıdır.' });
        return;
      }

      const result = await this.authService.resendVerification(email, userType as 'customer' | 'carrier');
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
