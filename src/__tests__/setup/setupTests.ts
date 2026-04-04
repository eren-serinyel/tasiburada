/**
 * setupTests.ts
 * Runs in each Jest worker process after the test framework is installed.
 * Initializes the DB connection once per worker and tears it down after all tests.
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import { AppDataSource, initializeDatabase, closeDatabase } from '../../infrastructure/database/data-source';

config(); // load .env

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    try {
      await initializeDatabase();
    } catch (err) {
      console.warn('⚠️  DB unavailable — tests relying on DB will behave defensively\n', err);
      process.env.SKIP_DB_TESTS = 'true';
    }
  }
}, 30000);

afterAll(async () => {
  try {
    await closeDatabase();
  } catch {
    // ignore close errors in tests
  }
}, 10000);
