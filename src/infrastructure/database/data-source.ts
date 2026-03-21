import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Not: Artık entity'leri tek tek import etmek yerine glob pattern ile yüklüyoruz.
// TypeORM 0.3.x DataSource entities alanı pattern dizilerini destekler.
// Development (ts-node) -> .ts, Production (derlenmiş) -> .js dosyaları.

// .env dosyasını yükle
config(); // .env değişkenlerini yükle

// Ortak ortam değişkenlerini oku (nullish coalescing ile varsayılanları ver)
const {
  DB_HOST,
  DB_PORT,
  DB_USERNAME,
  DB_PASSWORD,
  DB_NAME,
  DB_POOL,
  NODE_ENV,
  TS_NODE,
  TS_NODE_DEV
} = process.env;

// Sayısal değerleri parse et, başarısız olursa fallback kullan
const port = Number(DB_PORT ?? 3306) || 3306;
const poolSize = Number(DB_POOL ?? 10) || 10;
const isDev = (NODE_ENV ?? 'development') === 'development';

// Derlenmiş JS mi yoksa ts-node altında mı çalışıyoruz? (NODE_ENV'ten bağımsız gerçek çalışma şekli)
// production build'i development ortamda test ederken de doğru pattern seçimi için runtime tespiti.
const usingTsRuntime = Boolean(
  TS_NODE_DEV ||
  TS_NODE === 'true' ||
  process.argv.some(a => a.includes('ts-node')) ||
  /\.ts$/.test(__filename) // derlenmemiş dosya uzantısı
);

// Entity & migration pattern'leri (ts runtime -> kaynak .ts, aksi halde dist .js)
const entityPatterns = usingTsRuntime
  ? ['src/domain/entities/**/*.ts']
  : ['dist/domain/entities/**/*.js'];
const migrationPatterns = usingTsRuntime
  ? ['src/infrastructure/database/migrations/*.ts']
  : ['dist/infrastructure/database/migrations/*.js'];

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: DB_HOST ?? 'localhost',
  port,
  username: DB_USERNAME ?? 'root',
  password: DB_PASSWORD ?? '',
  database: DB_NAME ?? 'tasiburada_dev',
  synchronize: false, // üretimde migrations kullanılacak
  logging: isDev,     // sadece development'ta query logları
  entities: entityPatterns,
  migrations: migrationPatterns,
  migrationsTableName: 'migrations',
  charset: 'utf8mb4',
  timezone: '+03:00', // Türkiye saat dilimi
  extra: {
    connectionLimit: poolSize,
  }
});

// Database bağlantısını başlat
export const initializeDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    const opts = AppDataSource.options as any;
    console.log(`✅ DB connected → ${opts.type}://${opts.host}:${opts.port}/${opts.database}`);
    if (isDev) {
      console.log(`ℹ️  Pool Size: ${poolSize} | Logging: ${isDev}`);
      console.log(`📦 Runtime: ${usingTsRuntime ? 'ts-node' : 'compiled-js'} | Entities: ${entityPatterns.join(', ')}`);
    }
  } catch (err: any) {
    console.error('❌ DB connection failed');
    console.error(err?.message);
    if (isDev && err?.stack) console.error(err.stack);
    throw err;
  }
};

// Graceful shutdown için database bağlantısını kapat
export const closeDatabase = async (): Promise<void> => {
  try {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('📴 DB connection closed');
    }
  } catch (err: any) {
    console.error('❌ DB close failed');
    console.error(err?.message);
    if (isDev && err?.stack) console.error(err.stack);
    throw err;
  }
};