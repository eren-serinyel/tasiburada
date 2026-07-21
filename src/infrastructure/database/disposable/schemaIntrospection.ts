import mysql, {
  type Connection,
  type ConnectionOptions,
  type RowDataPacket,
} from 'mysql2/promise';
import {
  createCanonicalSchemaManifest,
  type AppliedMigration,
  type CanonicalSchemaManifest,
  type OrderedColumn,
  type SchemaCheckConstraint,
  type SchemaColumn,
  type SchemaConstraint,
  type SchemaForeignKey,
  type SchemaIndex,
  type SchemaManifestInput,
  type SchemaTable,
} from './schemaManifest';

export interface ReadOnlySchemaConnectionOptions {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const SAFE_DATABASE_IDENTIFIER = /^[a-zA-Z0-9_$-]{1,64}$/;

const required = (value: string | undefined, label: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Read-only schema source check failed: ${label} is required`);
  }
  return value;
};

export const readOnlySchemaConnectionOptionsFromEnvironment = (
  env: NodeJS.ProcessEnv,
): ReadOnlySchemaConnectionOptions => {
  const host = required(env.DB_HOST, 'DB_HOST').trim().toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    throw new Error(
      'Read-only schema source check failed: DB_HOST must be a loopback host',
    );
  }

  const database = required(env.DB_NAME, 'DB_NAME');
  if (!SAFE_DATABASE_IDENTIFIER.test(database)) {
    throw new Error(
      'Read-only schema source check failed: DB_NAME is not a safe identifier',
    );
  }

  const port = Number(env.DB_PORT ?? 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      'Read-only schema source check failed: DB_PORT is invalid',
    );
  }

  return {
    host,
    port,
    username: env.DB_USERNAME ?? 'root',
    password: env.DB_PASSWORD ?? '',
    database,
  };
};

const numberOrNull = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

const stringOrNull = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

const rowsForTable = <T>(
  rows: readonly (T & { readonly tableName: string })[],
  tableName: string,
): T[] =>
  rows
    .filter(row => row.tableName === tableName)
    .map(({ tableName: _tableName, ...row }) => row as T);

const collectConstraints = (
  rows: readonly {
    readonly tableName: string;
    readonly constraintName: string;
    readonly constraintType: string;
    readonly columnName: string;
    readonly ordinalPosition: number;
  }[],
  tableName: string,
  constraintType: 'PRIMARY KEY' | 'UNIQUE',
): SchemaConstraint[] => {
  const constraints = new Map<string, OrderedColumn[]>();

  for (const row of rows) {
    if (
      row.tableName !== tableName ||
      row.constraintType !== constraintType ||
      row.columnName === null
    ) {
      continue;
    }
    const columns = constraints.get(row.constraintName) ?? [];
    columns.push({
      name: String(row.columnName),
      position: Number(row.ordinalPosition),
    });
    constraints.set(row.constraintName, columns);
  }

  return Array.from(constraints, ([name, columns]) => ({ name, columns }));
};

const collectForeignKeys = (
  rows: readonly {
    readonly tableName: string;
    readonly constraintName: string;
    readonly columnName: string;
    readonly ordinalPosition: number;
    readonly referencedTable: string;
    readonly referencedColumn: string;
    readonly updateRule: string;
    readonly deleteRule: string;
  }[],
  tableName: string,
): SchemaForeignKey[] => {
  const foreignKeys = new Map<string, SchemaForeignKey>();

  for (const row of rows) {
    if (row.tableName !== tableName) {
      continue;
    }

    const existing = foreignKeys.get(row.constraintName);
    const column = {
      name: String(row.columnName),
      position: Number(row.ordinalPosition),
    };
    const referencedColumn = {
      name: String(row.referencedColumn),
      position: Number(row.ordinalPosition),
    };
    if (existing) {
      existing.columns.push(column);
      existing.referencedColumns.push(referencedColumn);
    } else {
      foreignKeys.set(row.constraintName, {
        name: String(row.constraintName),
        columns: [column],
        referencedTable: String(row.referencedTable),
        referencedColumns: [referencedColumn],
        updateRule: String(row.updateRule),
        deleteRule: String(row.deleteRule),
      });
    }
  }

  return Array.from(foreignKeys.values());
};

const inspectIndexes = async (
  connection: Connection,
  tableName: string,
): Promise<SchemaIndex[]> => {
  if (!SAFE_DATABASE_IDENTIFIER.test(tableName)) {
    throw new Error('Read-only schema inspection rejected an unsafe table name');
  }

  const [rawRows] = await connection.query<RowDataPacket[]>(
    `SHOW INDEX FROM \`${tableName}\``,
  );
  const indexes = new Map<string, SchemaIndex>();

  for (const row of rawRows) {
    const name = String(row.Key_name);
    const existing = indexes.get(name);
    const column = {
      name: stringOrNull(row.Column_name),
      position: Number(row.Seq_in_index),
      direction: stringOrNull(row.Collation),
      prefixLength: numberOrNull(row.Sub_part),
      expression: stringOrNull(row.Expression),
    };

    if (existing) {
      existing.columns.push(column);
    } else {
      indexes.set(name, {
        name,
        unique: Number(row.Non_unique) === 0,
        type: String(row.Index_type),
        visible:
          row.Visible === undefined || row.Visible === null
            ? null
            : String(row.Visible).toUpperCase() === 'YES',
        columns: [column],
      });
    }
  }

  return Array.from(indexes.values());
};

export const inspectCanonicalSchema = async (
  options: ReadOnlySchemaConnectionOptions,
): Promise<CanonicalSchemaManifest> => {
  const connectionOptions: ConnectionOptions = {
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    database: options.database,
    charset: 'utf8mb4',
  };
  const connection = await mysql.createConnection(connectionOptions);

  try {
    const [versionRows] = await connection.query<RowDataPacket[]>(
      'SELECT VERSION() AS mysqlVersion',
    );
    const [databaseRows] = await connection.execute<RowDataPacket[]>(
      `SELECT DEFAULT_CHARACTER_SET_NAME AS characterSet,
              DEFAULT_COLLATION_NAME AS collation
         FROM information_schema.SCHEMATA
        WHERE SCHEMA_NAME = ?`,
      [options.database],
    );
    const [tableRows] = await connection.execute<RowDataPacket[]>(
      `SELECT t.TABLE_NAME AS tableName,
              t.ENGINE AS engine,
              c.CHARACTER_SET_NAME AS characterSet,
              t.TABLE_COLLATION AS collation
         FROM information_schema.TABLES t
         JOIN information_schema.COLLATION_CHARACTER_SET_APPLICABILITY c
           ON c.COLLATION_NAME = t.TABLE_COLLATION
        WHERE t.TABLE_SCHEMA = ?
          AND t.TABLE_TYPE = 'BASE TABLE'
        ORDER BY t.TABLE_NAME`,
      [options.database],
    );
    const [columnRows] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName,
              COLUMN_NAME AS name,
              ORDINAL_POSITION AS ordinalPosition,
              COLUMN_TYPE AS physicalType,
              CHARACTER_MAXIMUM_LENGTH AS characterMaximumLength,
              NUMERIC_PRECISION AS numericPrecision,
              NUMERIC_SCALE AS numericScale,
              DATETIME_PRECISION AS datetimePrecision,
              IS_NULLABLE AS isNullable,
              COLUMN_DEFAULT AS defaultValue,
              GENERATION_EXPRESSION AS generatedExpression,
              EXTRA AS extra,
              CHARACTER_SET_NAME AS characterSet,
              COLLATION_NAME AS collation
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [options.database],
    );
    const [constraintRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tc.TABLE_NAME AS tableName,
              tc.CONSTRAINT_NAME AS constraintName,
              tc.CONSTRAINT_TYPE AS constraintType,
              kcu.COLUMN_NAME AS columnName,
              kcu.ORDINAL_POSITION AS ordinalPosition
         FROM information_schema.TABLE_CONSTRAINTS tc
         LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
           ON kcu.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
          AND kcu.TABLE_NAME = tc.TABLE_NAME
          AND kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_SCHEMA = ?
          AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'UNIQUE')
        ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
      [options.database],
    );
    const [foreignKeyRows] = await connection.execute<RowDataPacket[]>(
      `SELECT kcu.TABLE_NAME AS tableName,
              kcu.CONSTRAINT_NAME AS constraintName,
              kcu.COLUMN_NAME AS columnName,
              kcu.ORDINAL_POSITION AS ordinalPosition,
              kcu.REFERENCED_TABLE_NAME AS referencedTable,
              kcu.REFERENCED_COLUMN_NAME AS referencedColumn,
              rc.UPDATE_RULE AS updateRule,
              rc.DELETE_RULE AS deleteRule
         FROM information_schema.KEY_COLUMN_USAGE kcu
         JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
           ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
          AND rc.TABLE_NAME = kcu.TABLE_NAME
          AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        WHERE kcu.CONSTRAINT_SCHEMA = ?
          AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY kcu.TABLE_NAME, kcu.CONSTRAINT_NAME, kcu.ORDINAL_POSITION`,
      [options.database],
    );
    const [checkRows] = await connection.execute<RowDataPacket[]>(
      `SELECT tc.TABLE_NAME AS tableName,
              tc.CONSTRAINT_NAME AS name,
              cc.CHECK_CLAUSE AS expression
         FROM information_schema.TABLE_CONSTRAINTS tc
         JOIN information_schema.CHECK_CONSTRAINTS cc
           ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA
          AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        WHERE tc.CONSTRAINT_SCHEMA = ?
          AND tc.CONSTRAINT_TYPE = 'CHECK'
        ORDER BY tc.TABLE_NAME, tc.CONSTRAINT_NAME`,
      [options.database],
    );

    if (databaseRows.length !== 1) {
      throw new Error('Read-only schema inspection could not find the database');
    }

    const tables: SchemaTable[] = [];
    for (const tableRow of tableRows) {
      const tableName = String(tableRow.tableName);
      const columns: SchemaColumn[] = rowsForTable<any>(
        columnRows.map(row => ({
          tableName: String(row.tableName),
          name: String(row.name),
          ordinalPosition: Number(row.ordinalPosition),
          physicalType: String(row.physicalType),
          characterMaximumLength: numberOrNull(row.characterMaximumLength),
          numericPrecision: numberOrNull(row.numericPrecision),
          numericScale: numberOrNull(row.numericScale),
          datetimePrecision: numberOrNull(row.datetimePrecision),
          nullable: String(row.isNullable) === 'YES',
          defaultValue: stringOrNull(row.defaultValue),
          generatedExpression: stringOrNull(row.generatedExpression),
          extra: String(row.extra ?? ''),
          characterSet: stringOrNull(row.characterSet),
          collation: stringOrNull(row.collation),
        })),
        tableName,
      );
      const normalizedConstraintRows = constraintRows.map(row => ({
        tableName: String(row.tableName),
        constraintName: String(row.constraintName),
        constraintType: String(row.constraintType),
        columnName: row.columnName,
        ordinalPosition: Number(row.ordinalPosition),
      }));
      const primaryKey =
        collectConstraints(
          normalizedConstraintRows,
          tableName,
          'PRIMARY KEY',
        )[0]?.columns ?? [];
      const uniqueConstraints = collectConstraints(
        normalizedConstraintRows,
        tableName,
        'UNIQUE',
      );
      const foreignKeys = collectForeignKeys(
        foreignKeyRows.map(row => ({
          tableName: String(row.tableName),
          constraintName: String(row.constraintName),
          columnName: String(row.columnName),
          ordinalPosition: Number(row.ordinalPosition),
          referencedTable: String(row.referencedTable),
          referencedColumn: String(row.referencedColumn),
          updateRule: String(row.updateRule),
          deleteRule: String(row.deleteRule),
        })),
        tableName,
      );
      const checkConstraints: SchemaCheckConstraint[] = rowsForTable<any>(
        checkRows.map(row => ({
          tableName: String(row.tableName),
          name: String(row.name),
          expression: String(row.expression),
        })),
        tableName,
      );

      tables.push({
        name: tableName,
        engine: String(tableRow.engine),
        characterSet: String(tableRow.characterSet),
        collation: String(tableRow.collation),
        columns,
        primaryKey,
        uniqueConstraints,
        indexes: await inspectIndexes(connection, tableName),
        foreignKeys,
        checkConstraints,
      });
    }

    let migrations: AppliedMigration[] = [];
    if (tables.some(table => table.name === 'migrations')) {
      const [migrationRows] = await connection.query<RowDataPacket[]>(
        'SELECT id, timestamp, name FROM `migrations` ORDER BY timestamp, id, name',
      );
      migrations = migrationRows.map(row => ({
        id: Number(row.id),
        timestamp: Number(row.timestamp),
        name: String(row.name),
      }));
    }

    const input: SchemaManifestInput = {
      mysqlVersion: String(versionRows[0]?.mysqlVersion ?? ''),
      databaseName: options.database,
      databaseCharacterSet: String(databaseRows[0].characterSet),
      databaseCollation: String(databaseRows[0].collation),
      tables,
      migrations,
    };
    return createCanonicalSchemaManifest(input);
  } finally {
    await connection.end();
  }
};
