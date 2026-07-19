import { execFileSync } from 'child_process';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import {
  inspectCanonicalSchema,
  readOnlySchemaConnectionOptionsFromEnvironment,
} from '../disposable/schemaIntrospection';
import { CANONICAL_V1_FINGERPRINT } from './canonicalSeedHarness';

export type RuntimeCutoverPreflightStatus =
  | 'READY_FOR_EXPLICIT_DESTRUCTIVE_APPROVAL'
  | 'BLOCKED_REMOTE_HOST'
  | 'BLOCKED_UNEXPECTED_DATABASE'
  | 'BLOCKED_SCHEMA_MISMATCH'
  | 'BLOCKED_CONNECTION'
  | 'BLOCKED_ENVIRONMENT';

export interface RuntimeCutoverPreflightResult {
  readonly status: RuntimeCutoverPreflightStatus;
  readonly hostClass: 'loopback' | 'remote' | 'unknown';
  readonly databaseName: string;
  readonly mysqlVersion?: string;
  readonly characterSet?: string;
  readonly collation?: string;
  readonly sessionTimezone?: string;
  readonly globalTimezone?: string;
  readonly schemaFingerprint?: string;
  readonly appliedMigrationCount?: number;
  readonly approximateRowCounts?: Readonly<Record<string, number>>;
  readonly gitBranch?: string;
  readonly gitHead?: string;
  readonly seededDataStatus: 'doğrulanamadı';
  readonly note: string;
}

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const EXPECTED_DATABASE = 'tasiburada_dev';
const UNSAFE_DATABASE_MARKER = /(production|prod|staging|stage|live)/i;

const gitValue = (args: string[]): string | undefined => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
};

const baseResult = (
  env: NodeJS.ProcessEnv,
  status: RuntimeCutoverPreflightStatus,
  hostClass: RuntimeCutoverPreflightResult['hostClass'],
  note: string,
): RuntimeCutoverPreflightResult => ({
  status,
  hostClass,
  databaseName: env.DB_NAME ?? '',
  gitBranch: gitValue(['branch', '--show-current']),
  gitHead: gitValue(['rev-parse', 'HEAD']),
  seededDataStatus: 'doğrulanamadı',
  note,
});

export const classifyRuntimeCutoverEnvironment = (
  env: NodeJS.ProcessEnv,
): RuntimeCutoverPreflightResult | undefined => {
  const host = env.DB_HOST?.trim().toLowerCase();
  const hostClass = host
    ? LOOPBACK_HOSTS.has(host)
      ? 'loopback'
      : 'remote'
    : 'unknown';

  if (env.NODE_ENV !== 'development') {
    return baseResult(
      env,
      'BLOCKED_ENVIRONMENT',
      hostClass,
      'NODE_ENV must be exactly development.',
    );
  }
  if (hostClass !== 'loopback') {
    return baseResult(
      env,
      'BLOCKED_REMOTE_HOST',
      hostClass,
      'The runtime cutover preflight is restricted to loopback.',
    );
  }
  if (
    env.M0B_CUTOVER_PREFLIGHT_DATABASE !== EXPECTED_DATABASE ||
    env.DB_NAME !== EXPECTED_DATABASE ||
    UNSAFE_DATABASE_MARKER.test(env.DB_NAME)
  ) {
    return baseResult(
      env,
      'BLOCKED_UNEXPECTED_DATABASE',
      hostClass,
      'DB_NAME and the explicit preflight allowlist must both be tasiburada_dev.',
    );
  }
  return undefined;
};

export const classifyRuntimeCutoverFingerprint = (
  fingerprint: string,
): RuntimeCutoverPreflightStatus =>
  fingerprint === CANONICAL_V1_FINGERPRINT
    ? 'READY_FOR_EXPLICIT_DESTRUCTIVE_APPROVAL'
    : 'BLOCKED_SCHEMA_MISMATCH';

export const runRuntimeCutoverPreflight = async (
  env: NodeJS.ProcessEnv = process.env,
): Promise<RuntimeCutoverPreflightResult> => {
  const environmentBlock = classifyRuntimeCutoverEnvironment(env);
  if (environmentBlock) {
    return environmentBlock;
  }

  const base = baseResult(
    env,
    'BLOCKED_CONNECTION',
    'loopback',
    'Connection could not be verified.',
  );

  try {
    const options = readOnlySchemaConnectionOptionsFromEnvironment(env);
    const manifest = await inspectCanonicalSchema(options);
    const connection = await mysql.createConnection({
      host: options.host,
      port: options.port,
      user: options.username,
      password: options.password,
      database: options.database,
      charset: 'utf8mb4',
    });

    let sessionTimezone = '';
    let globalTimezone = '';
    const approximateRowCounts: Record<string, number> = {};
    try {
      const [timezoneRows] = await connection.query<RowDataPacket[]>(
        `SELECT @@session.time_zone AS sessionTimezone,
                @@global.time_zone AS globalTimezone`,
      );
      sessionTimezone = String(timezoneRows[0].sessionTimezone);
      globalTimezone = String(timezoneRows[0].globalTimezone);

      const [rowCountRows] = await connection.execute<RowDataPacket[]>(
        `SELECT TABLE_NAME AS tableName,
                TABLE_ROWS AS approximateRowCount
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE'
          ORDER BY TABLE_NAME`,
        [options.database],
      );
      for (const row of rowCountRows) {
        approximateRowCounts[String(row.tableName)] = Number(
          row.approximateRowCount ?? 0,
        );
      }
    } finally {
      await connection.end();
    }

    const fingerprintStatus = classifyRuntimeCutoverFingerprint(
      manifest.schemaFingerprint,
    );
    const matchesCanonical =
      fingerprintStatus === 'READY_FOR_EXPLICIT_DESTRUCTIVE_APPROVAL';
    return {
      ...base,
      status: fingerprintStatus,
      mysqlVersion: manifest.metadata.mysqlVersion,
      characterSet: manifest.database.characterSet,
      collation: manifest.database.collation,
      sessionTimezone,
      globalTimezone,
      schemaFingerprint: manifest.schemaFingerprint,
      appliedMigrationCount: manifest.migrations.length,
      approximateRowCounts,
      note: matchesCanonical
        ? 'Canonical baseline cannot be applied in place; explicit M0B-2B approval is still required.'
        : 'Physical schema fingerprint does not match canonical V1.',
    };
  } catch {
    return base;
  }
};
