import { config } from 'dotenv';
import {
  type DisposableDatabaseOperation,
} from './disposableDatabaseSafety';
import {
  createDisposableDatabase,
  dropDisposableDatabase,
  inspectDisposableDatabase,
} from './disposableMysqlHarness';

config();

const databaseName = process.env.DISPOSABLE_DB_NAME;

const main = async (): Promise<void> => {
  const command = process.argv[2];
  const operations: Record<string, DisposableDatabaseOperation> = {
    create: 'CREATE',
    inspect: 'CONNECT',
    drop: 'DROP',
  };
  if (!command || !operations[command]) {
    throw new Error(
      'Disposable database error: command must be create, inspect, or drop',
    );
  }

  if (command === 'create') {
    const target = await createDisposableDatabase(process.env, databaseName);
    console.log(`Created disposable database: ${target}`);
  } else if (command === 'inspect') {
    const inspection = await inspectDisposableDatabase(
      process.env,
      databaseName,
    );
    console.log(`Disposable database: ${inspection.databaseName}`);
    console.log(`MySQL version: ${inspection.mysqlVersion}`);
    console.log(
      `Charset/collation: ${inspection.characterSet}/${inspection.collation}`,
    );
    console.log(`Table count: ${inspection.tableCount}`);
  } else {
    const target = await dropDisposableDatabase(process.env, databaseName);
    console.log(`Dropped disposable database: ${target}`);
  }
};

main().catch(error => {
  const message =
    error instanceof Error &&
    (error.message.startsWith('Disposable database safety check failed:') ||
      error.message.startsWith('Disposable database error:'))
      ? error.message
      : 'Disposable database error: command did not complete';
  console.error(message);
  process.exitCode = 1;
});
