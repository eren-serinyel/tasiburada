import { Request, Response } from 'express';
import { AiService } from '../../application/services/AiService';
import { AppError } from '../../domain/errors/AppError';

export class AiController {
  private aiService = new AiService();

  chat = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.aiService.chat(req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      this.handleError(res, error, 'AI cevabı alınamadı.');
    }
  };

  status = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      data: this.aiService.getStatus(),
    });
  };

  private handleError(res: Response, error: unknown, fallbackMessage: string): void {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
        code: error.code,
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : fallbackMessage,
    });
  }
}
