import { Request, Response } from 'express';
import { ConverterService } from '../../application/services/ConverterService';

const resolveUserId = (req: Request): string | null => {
  return req.user?.customerId || req.user?.carrierId || req.user?.adminId || null;
};

export class ConverterController {
  private converterService = new ConverterService();

  createSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.converterService.createSession(resolveUserId(req), req.body);
      res.status(201).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Converter oturumu oluşturulamadı.',
      });
    }
  };

  estimate = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.converterService.estimate(req.params.sessionId, resolveUserId(req), req.body);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Converter tahmini oluşturulamadı.',
      });
    }
  };

  getResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.converterService.getResult(req.params.sessionId, resolveUserId(req));
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Converter sonucu alınamadı.',
      });
    }
  };

  applyToShipment = async (req: Request, res: Response): Promise<void> => {
    try {
      const data = await this.converterService.applyToShipment(req.params.sessionId, resolveUserId(req), req.body);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(error.statusCode || 400).json({
        success: false,
        message: error.message || 'Converter sonucu shipmenta uygulanamadı.',
      });
    }
  };
}
