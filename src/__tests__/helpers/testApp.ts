import 'reflect-metadata';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import routes from '../../presentation/routes';
import { AppError } from '../../domain/errors/AppError';
import { authenticateToken } from '../../presentation/middleware/auth';

/**
 * Creates a fully configured Express app for integration tests.
 * Does NOT start listening or connect to the database.
 * Database must be initialized before tests via globalSetup.
 */
function buildTestApp(): express.Application {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Upload routes — mirror index.ts behaviour
  const resolveUploadFile = (folder: string, filename: string): string | null => {
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return null;
    }
    const filePath = path.resolve(process.cwd(), 'uploads', folder, filename);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    if (!filePath.startsWith(uploadsRoot + path.sep)) {
      return null;
    }
    return filePath;
  };

  app.get('/uploads/pictures/:filename', (req: Request, res: Response): void => {
    const { filename } = req.params;
    const filePath = resolveUploadFile('pictures', filename);
    if (!filePath) { res.status(400).json({ success: false, message: 'Geçersiz dosya adı.' }); return; }
    if (!fs.existsSync(filePath)) { res.status(404).json({ success: false, message: 'Dosya bulunamadı.' }); return; }
    res.sendFile(filePath);
  });

  app.get('/uploads/documents/:filename', authenticateToken, (req: Request, res: Response): void => {
    const { filename } = req.params;
    const filePath = resolveUploadFile('documents', filename);
    if (!filePath) { res.status(400).json({ success: false, message: 'Geçersiz dosya adı.' }); return; }
    if (!fs.existsSync(filePath)) { res.status(404).json({ success: false, message: 'Dosya bulunamadı.' }); return; }
    res.sendFile(filePath);
  });

  // Tight rate limits for auth in production; in tests we loosen them.
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: false,
    legacyHeaders: false,
  });

  app.use('/api/v1', testLimiter, routes);

  // Global error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
        code: err.code,
      });
    }
    console.error('Test app unhandled error:', err);
    return res.status(500).json({ success: false, message: 'Sunucu hatası oluştu.' });
  });

  app.use('*', (_req: express.Request, res: express.Response) => {
    res.status(404).json({ success: false, message: 'Endpoint bulunamadı.' });
  });

  return app;
}

export const testApp = buildTestApp();
