import mysql, {
  type Connection,
  type ConnectionOptions,
  type RowDataPacket,
} from 'mysql2/promise';
import {
  assertRuntimeCutoverSafety,
  type RuntimeCutoverEnvironment,
  type RuntimeCutoverSafetyResult,
} from './runtimeCutoverSafety';

export type RuntimeCutoverConnectionFactory = (
  options: ConnectionOptions,
) => Promise<Connection>;

const portFromEnvironment = (
  env: RuntimeCutoverEnvironment,
): number => {
  const port = Number(env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('M0B destructive cutover failed: invalid DB_PORT');
  }
  return port;
};

export const executeRuntimeCutoverReset = async (
  env: RuntimeCutoverEnvironment,
  connectionFactory: RuntimeCutoverConnectionFactory =
    mysql.createConnection,
): Promise<RuntimeCutoverSafetyResult> => {
  const safety = assertRuntimeCutoverSafety(env);
  const options: ConnectionOptions = {
    host: env.DB_HOST,
    port: portFromEnvironment(env),
    user: env.DB_USERNAME ?? 'root',
    password: env.DB_PASSWORD ?? '',
    charset: 'utf8mb4',
  };
  const connection = await connectionFactory(options);

  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT SCHEMA_NAME
         FROM information_schema.SCHEMATA
        WHERE SCHEMA_NAME = ?`,
      [safety.databaseName],
    );
    if (rows.length !== 1) {
      throw new Error(
        'M0B destructive cutover failed: target database does not exist',
      );
    }

    await connection.query('DROP DATABASE `tasiburada_dev`');
    await connection.query(
      'CREATE DATABASE `tasiburada_dev` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    );

    const [createdRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DEFAULT_CHARACTER_SET_NAME AS characterSet,
              DEFAULT_COLLATION_NAME AS collation
         FROM information_schema.SCHEMATA
        WHERE SCHEMA_NAME = ?`,
      [safety.databaseName],
    );
    if (
      createdRows.length !== 1 ||
      String(createdRows[0].characterSet) !== 'utf8mb4' ||
      String(createdRows[0].collation) !== 'utf8mb4_unicode_ci'
    ) {
      throw new Error(
        'M0B destructive cutover failed: recreated database metadata mismatch',
      );
    }
    return safety;
  } finally {
    await connection.end();
  }
};
