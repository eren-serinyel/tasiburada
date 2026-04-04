import 'reflect-metadata';
import { config } from 'dotenv';
import { initializeDatabase } from '../../infrastructure/database/data-source';

/**
 * Called once before all test suites.
 * Initializes the database connection so TypeORM repositories are available.
 * If DB connection fails (e.g., CI without MySQL), tests that require DB
 * will be skipped via the SKIP_DB_TESTS env flag set here.
 */
export default async function globalSetup(): Promise<void> {
  config(); // load .env

  try {
    await initializeDatabase();
    console.log('\n✅  Test DB connected\n');
  } catch (err) {
    console.warn('\n⚠️  DB unavailable — DB-dependent tests will be skipped\n', err);
    process.env.SKIP_DB_TESTS = 'true';
  }
}
