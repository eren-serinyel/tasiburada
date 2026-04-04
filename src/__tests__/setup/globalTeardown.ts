import { closeDatabase } from '../../infrastructure/database/data-source';

/**
 * Called once after all test suites complete.
 * Closes the database connection to allow Jest to exit cleanly.
 */
export default async function globalTeardown(): Promise<void> {
  try {
    await closeDatabase();
    console.log('\n🔌  Test DB connection closed\n');
  } catch {
    // Already closed or never opened
  }
}
