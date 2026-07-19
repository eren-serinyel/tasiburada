import { config } from 'dotenv';
import mysql, {
  type ConnectionOptions,
  type RowDataPacket,
} from 'mysql2/promise';
import {
  assertSafeDisposableDatabaseTarget,
  type DisposableDatabaseOperation,
} from './disposableDatabaseSafety';

config();

const databaseName = process.env.DISPOSABLE_DB_NAME;

const portFromEnvironment = (): number => {
  const port = Number(process.env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Disposable database error: DB_PORT is invalid');
  }
  return port;
};

const connectionOptions = (includeDatabase: boolean): ConnectionOptions => ({
  host: process.env.DB_HOST,
  port: portFromEnvironment(),
  user: process.env.DB_USERNAME ?? 'root',
  password: process.env.DB_PASSWORD ?? '',
  ...(includeDatabase ? { database: databaseName } : {}),
  charset: 'utf8mb4',
});

const quotedDatabaseName = (): string => `\`${databaseName}\``;

const databaseExists = async (
  connection: Awaited<ReturnType<typeof mysql.createConnection>>,
): Promise<boolean> => {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT SCHEMA_NAME
       FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME = ?`,
    [databaseName],
  );
  return rows.length === 1;
};

const createDisposableDatabase = async (): Promise<void> => {
  assertSafeDisposableDatabaseTarget(process.env, databaseName, 'CREATE');
  const connection = await mysql.createConnection(connectionOptions(false));
  try {
    if (await databaseExists(connection)) {
      throw new Error('Disposable database error: target already exists');
    }
    await connection.query(
      `CREATE DATABASE ${quotedDatabaseName()} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    console.log(`Created disposable database: ${databaseName}`);
  } finally {
    await connection.end();
  }
};

const inspectDisposableDatabase = async (): Promise<void> => {
  assertSafeDisposableDatabaseTarget(process.env, databaseName, 'CONNECT');
  const connection = await mysql.createConnection(connectionOptions(true));
  try {
    const [versionRows] = await connection.query<RowDataPacket[]>(
      'SELECT VERSION() AS mysqlVersion',
    );
    const [schemaRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DEFAULT_CHARACTER_SET_NAME AS characterSet,
              DEFAULT_COLLATION_NAME AS collation
         FROM information_schema.SCHEMATA
        WHERE SCHEMA_NAME = ?`,
      [databaseName],
    );
    const [tableRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS tableCount
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'`,
      [databaseName],
    );

    if (schemaRows.length !== 1) {
      throw new Error('Disposable database error: target does not exist');
    }

    console.log(`Disposable database: ${databaseName}`);
    console.log(`MySQL version: ${String(versionRows[0].mysqlVersion)}`);
    console.log(
      `Charset/collation: ${String(schemaRows[0].characterSet)}/${String(
        schemaRows[0].collation,
      )}`,
    );
    console.log(`Table count: ${Number(tableRows[0].tableCount)}`);
  } finally {
    await connection.end();
  }
};

const dropDisposableDatabase = async (): Promise<void> => {
  assertSafeDisposableDatabaseTarget(process.env, databaseName, 'DROP');
  const connection = await mysql.createConnection(connectionOptions(false));
  try {
    if (!(await databaseExists(connection))) {
      throw new Error('Disposable database error: target does not exist');
    }
    await connection.query(`DROP DATABASE ${quotedDatabaseName()}`);
    if (await databaseExists(connection)) {
      throw new Error('Disposable database error: target still exists');
    }
    console.log(`Dropped disposable database: ${databaseName}`);
  } finally {
    await connection.end();
  }
};

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
    await createDisposableDatabase();
  } else if (command === 'inspect') {
    await inspectDisposableDatabase();
  } else {
    await dropDisposableDatabase();
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
