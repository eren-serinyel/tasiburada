import mysql, {
  type ConnectionOptions,
  type RowDataPacket,
} from 'mysql2/promise';
import {
  assertSafeDisposableDatabaseTarget,
  type DisposableDatabaseEnvironment,
} from './disposableDatabaseSafety';

export interface DisposableDatabaseInspection {
  readonly databaseName: string;
  readonly mysqlVersion: string;
  readonly characterSet: string;
  readonly collation: string;
  readonly tableCount: number;
}

const portFromEnvironment = (
  env: DisposableDatabaseEnvironment,
): number => {
  const port = Number(env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Disposable database error: DB_PORT is invalid');
  }
  return port;
};

const connectionOptions = (
  env: DisposableDatabaseEnvironment,
  databaseName: string,
  includeDatabase: boolean,
): ConnectionOptions => ({
  host: env.DB_HOST,
  port: portFromEnvironment(env),
  user: env.DB_USERNAME ?? 'root',
  password: env.DB_PASSWORD ?? '',
  ...(includeDatabase ? { database: databaseName } : {}),
  charset: 'utf8mb4',
});

const quotedDatabaseName = (databaseName: string): string =>
  `\`${databaseName}\``;

const databaseExists = async (
  connection: Awaited<ReturnType<typeof mysql.createConnection>>,
  databaseName: string,
): Promise<boolean> => {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT SCHEMA_NAME
       FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME = ?`,
    [databaseName],
  );
  return rows.length === 1;
};

export const createDisposableDatabase = async (
  env: DisposableDatabaseEnvironment,
  databaseName: string | undefined,
): Promise<string> => {
  assertSafeDisposableDatabaseTarget(env, databaseName, 'CREATE');
  const target = databaseName as string;
  const connection = await mysql.createConnection(
    connectionOptions(env, target, false),
  );
  try {
    if (await databaseExists(connection, target)) {
      throw new Error('Disposable database error: target already exists');
    }
    await connection.query(
      `CREATE DATABASE ${quotedDatabaseName(target)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    return target;
  } finally {
    await connection.end();
  }
};

export const inspectDisposableDatabase = async (
  env: DisposableDatabaseEnvironment,
  databaseName: string | undefined,
): Promise<DisposableDatabaseInspection> => {
  assertSafeDisposableDatabaseTarget(env, databaseName, 'CONNECT');
  const target = databaseName as string;
  const connection = await mysql.createConnection(
    connectionOptions(env, target, true),
  );
  try {
    const [versionRows] = await connection.query<RowDataPacket[]>(
      'SELECT VERSION() AS mysqlVersion',
    );
    const [schemaRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DEFAULT_CHARACTER_SET_NAME AS characterSet,
              DEFAULT_COLLATION_NAME AS collation
         FROM information_schema.SCHEMATA
        WHERE SCHEMA_NAME = ?`,
      [target],
    );
    const [tableRows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS tableCount
         FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'`,
      [target],
    );

    if (schemaRows.length !== 1) {
      throw new Error('Disposable database error: target does not exist');
    }

    return {
      databaseName: target,
      mysqlVersion: String(versionRows[0].mysqlVersion),
      characterSet: String(schemaRows[0].characterSet),
      collation: String(schemaRows[0].collation),
      tableCount: Number(tableRows[0].tableCount),
    };
  } finally {
    await connection.end();
  }
};

export const dropDisposableDatabase = async (
  env: DisposableDatabaseEnvironment,
  databaseName: string | undefined,
): Promise<string> => {
  assertSafeDisposableDatabaseTarget(env, databaseName, 'DROP');
  const target = databaseName as string;
  const connection = await mysql.createConnection(
    connectionOptions(env, target, false),
  );
  try {
    if (!(await databaseExists(connection, target))) {
      throw new Error('Disposable database error: target does not exist');
    }
    await connection.query(`DROP DATABASE ${quotedDatabaseName(target)}`);
    if (await databaseExists(connection, target)) {
      throw new Error('Disposable database error: target still exists');
    }
    return target;
  } finally {
    await connection.end();
  }
};
