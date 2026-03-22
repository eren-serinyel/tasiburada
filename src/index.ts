import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import net from 'node:net';
import path from 'node:path';
import { config } from 'dotenv';

import { initializeDatabase, closeDatabase } from './infrastructure/database/data-source';
import routes from './presentation/routes';

// .env dosyasını yükle
config();

const app = express();
const DEFAULT_PORT = 3001;

const resolvePort = (value?: string): number => {
  const parsed = Number(value);
  if (!Number.isNaN(parsed) && parsed > 0 && parsed < 65535) {
    return parsed;
  }
  return DEFAULT_PORT;
};

const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise(resolve => {
    const tester = net.createServer()
      .once('error', err => {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'EADDRINUSE' || code === 'EACCES') {
          resolve(false);
        } else {
          console.error(`⚠️  Port probe failed for ${port}:`, err);
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port);

    tester.unref?.();
  });
};

const findAvailablePort = async (preferredPort: number, attempts = 5): Promise<{ port: number; conflicted: boolean }> => {
  let port = preferredPort;
  for (let i = 0; i < attempts; i++) {
    if (await isPortAvailable(port)) {
      return { port, conflicted: i > 0 };
    }
    port += 1;
  }
  throw new Error(`No available port found between ${preferredPort} and ${port - 1}.`);
};

// Middleware'ler
app.use(helmet()); // Security headers
// CORS configuration - very permissive for development
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(morgan('combined')); // HTTP request logger
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çok fazla istek gönderdiniz. Lütfen bekleyin.'
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çok fazla giriş denemesi. 15 dakika bekleyin.'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Çok fazla kayıt denemesi.'
  }
});

// Routes
app.use('/api/v1/customers/login', loginLimiter);
app.use('/api/v1/carriers/login', loginLimiter);
app.use('/api/v1/customers/register', registerLimiter);
app.use('/api/v1/carriers/register', registerLimiter);
app.use('/api/v1', apiLimiter, routes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global Error Handler:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Sunucu hatası oluştu.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint bulunamadı.',
    path: req.originalUrl
  });
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received. Shutting down gracefully...');
  await closeDatabase();
  process.exit(0);
});

// Database bağlantısını başlat ve sunucuyu çalıştır
const startServer = async (): Promise<void> => {
  try {
    // Database bağlantısını başlat
    await initializeDatabase();

    const preferredPort = resolvePort(process.env.PORT);
    const { port, conflicted } = await findAvailablePort(preferredPort);

    if (conflicted) {
      console.warn(`⚠️  Port ${preferredPort} in use. Switching to available port ${port}.`);
    }

    // Express sunucusunu başlat
    app.listen(port, () => {
      console.log('🚀 ======================================');
      console.log('🏗️  Taşıburada Backend Server Started');
      console.log('🚀 ======================================');
      console.log(`🌐 Server running on port: ${port}`);
      console.log(`🔗 API Base URL: http://localhost:${port}/api/v1`);
      console.log(`📊 Health Check: http://localhost:${port}/api/v1/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🚀 ======================================');
      
      // API endpoints bilgisi
      console.log('📋 Available Endpoints:');
      console.log('   - POST /api/v1/customers/register');
      console.log('   - POST /api/v1/customers/login');
      console.log('   - GET  /api/v1/customers/profile');
      console.log('   - POST /api/v1/shipments');
      console.log('   - GET  /api/v1/shipments/pending');
      console.log('   - GET  /api/v1/health');
      console.log('🚀 ======================================');
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    console.error('💡 Please check:');
    console.error('   1. MySQL server is running');
    console.error('   2. Database credentials in .env file');
    console.error('   3. Database "tasiburada_dev" exists');
    process.exit(1);
  }
};

// Sunucuyu başlat
startServer();