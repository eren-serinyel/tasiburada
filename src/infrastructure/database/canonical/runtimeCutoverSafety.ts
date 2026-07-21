import {
  existsSync,
  readFileSync,
  realpathSync,
  statSync,
} from 'fs';
import { createHash } from 'crypto';
import {
  isAbsolute,
  relative,
  resolve,
} from 'path';

export interface RuntimeCutoverEnvironment {
  readonly [key: string]: string | undefined;
  readonly NODE_ENV?: string;
  readonly DB_HOST?: string;
  readonly DB_NAME?: string;
  readonly ALLOW_M0B_DESTRUCTIVE_CUTOVER?: string;
  readonly CONFIRM_M0B_CUTOVER_DATABASE?: string;
  readonly CONFIRM_M0B_DESTRUCTIVE_ACTION?: string;
  readonly CONFIRM_M0B_BACKUP_SHA256?: string;
  readonly CONFIRM_M0B_BACKUP_RESTORE_VERIFIED?: string;
  readonly M0B_BACKUP_FILE?: string;
}

export interface RuntimeCutoverSafetyResult {
  readonly databaseName: 'tasiburada_dev';
  readonly backupFile: string;
  readonly backupSha256: string;
  readonly backupBytes: number;
}

const TARGET_DATABASE = 'tasiburada_dev';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const UNSAFE_MARKER = /(production|prod|staging|stage|live)/i;
const SHA256 = /^[a-f0-9]{64}$/;

const fail = (reason: string): never => {
  throw new Error(`M0B destructive cutover safety check failed: ${reason}`);
};

const required = (
  value: string | undefined,
  reason: string,
): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(reason);
  }
  return (value as string).trim();
};

const pathIsInside = (parent: string, child: string): boolean => {
  const relation = relative(parent, child);
  return relation === '' ||
    (!relation.startsWith('..') && !isAbsolute(relation));
};

export const sha256File = (file: string): string =>
  createHash('sha256').update(readFileSync(file)).digest('hex');

export const assertRuntimeCutoverSafety = (
  env: RuntimeCutoverEnvironment,
  repositoryRoot: string = process.cwd(),
): RuntimeCutoverSafetyResult => {
  if (env.NODE_ENV !== 'development') {
    fail('NODE_ENV must be exactly development');
  }

  const host = required(env.DB_HOST, 'DB_HOST must be explicit').toLowerCase();
  if (!LOOPBACK_HOSTS.has(host)) {
    fail('DB_HOST must be loopback');
  }

  const databaseName = required(env.DB_NAME, 'DB_NAME must be explicit');
  if (
    databaseName !== TARGET_DATABASE ||
    UNSAFE_MARKER.test(databaseName.replace(/_dev$/, ''))
  ) {
    fail('DB_NAME must be exactly tasiburada_dev');
  }

  if (env.ALLOW_M0B_DESTRUCTIVE_CUTOVER !== 'true') {
    fail('ALLOW_M0B_DESTRUCTIVE_CUTOVER must be exactly true');
  }
  if (env.CONFIRM_M0B_CUTOVER_DATABASE !== TARGET_DATABASE) {
    fail('database confirmation mismatch');
  }
  if (
    env.CONFIRM_M0B_DESTRUCTIVE_ACTION !==
    'DROP_AND_RECREATE_tasiburada_dev'
  ) {
    fail('destructive action confirmation mismatch');
  }
  if (env.CONFIRM_M0B_BACKUP_RESTORE_VERIFIED !== 'true') {
    fail('backup restore must be verified');
  }

  const expectedHash = required(
    env.CONFIRM_M0B_BACKUP_SHA256,
    'backup SHA-256 confirmation is required',
  ).toLowerCase();
  if (!SHA256.test(expectedHash)) {
    fail('backup SHA-256 confirmation is invalid');
  }

  const configuredBackup = resolve(
    required(env.M0B_BACKUP_FILE, 'backup file must be explicit'),
  );
  if (!existsSync(configuredBackup)) {
    fail('backup file does not exist');
  }
  const backupFile = realpathSync(configuredBackup);
  const repo = realpathSync(resolve(repositoryRoot));
  if (pathIsInside(repo, backupFile)) {
    fail('backup file must be outside the repository');
  }

  const backupStat = statSync(backupFile);
  if (!backupStat.isFile() || backupStat.size <= 0) {
    fail('backup file must be a non-empty file');
  }
  const actualHash = sha256File(backupFile);
  if (actualHash !== expectedHash) {
    fail('backup SHA-256 confirmation mismatch');
  }

  return {
    databaseName: TARGET_DATABASE,
    backupFile,
    backupSha256: actualHash,
    backupBytes: backupStat.size,
  };
};
