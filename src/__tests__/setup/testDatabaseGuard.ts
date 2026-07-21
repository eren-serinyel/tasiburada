import { config } from 'dotenv';
import { assertSafeTestDatabase } from '../../infrastructure/database/databaseSafety';

config();
assertSafeTestDatabase(process.env);
