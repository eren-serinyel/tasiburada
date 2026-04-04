import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import routes from '../../presentation/routes';
import { AppError } from '../../domain/errors/AppError';

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
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Tight rate limits for auth in production; in tests we loosen them.
  const testLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 1000, // effectively disabled for tests
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
