import { config } from 'dotenv';
import { executeRuntimeCutoverReset } from './runtimeCutoverExecute';

config();

void executeRuntimeCutoverReset(process.env)
  .then(result => {
    console.log(`M0B cutover database recreated: ${result.databaseName}`);
    console.log(`Verified backup bytes: ${result.backupBytes}`);
    console.log(`Verified backup SHA-256: ${result.backupSha256}`);
  })
  .catch(error => {
    const message =
      error instanceof Error &&
      (error.message.startsWith('M0B destructive cutover safety check failed:') ||
        error.message.startsWith('M0B destructive cutover failed:'))
        ? error.message
        : 'M0B destructive cutover failed';
    console.error(message);
    process.exitCode = 1;
  });
