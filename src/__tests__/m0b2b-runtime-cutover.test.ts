import {
  mkdtempSync,
  readFileSync,
  rmdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { createHash } from 'crypto';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import type { Connection } from 'mysql2/promise';
import {
  CANONICAL_MIGRATIONS,
  CANONICAL_MIGRATION_NAME,
} from '../infrastructure/database/canonical/canonicalMigrationRegistry';
import { CanonicalBaselineV11784500000000 } from '../infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1';
import {
  assertRuntimeCutoverSafety,
  type RuntimeCutoverEnvironment,
} from '../infrastructure/database/canonical/runtimeCutoverSafety';
import { executeRuntimeCutoverReset } from '../infrastructure/database/canonical/runtimeCutoverExecute';
import type { CanonicalSchemaManifest } from '../infrastructure/database/disposable/schemaManifest';

const root = process.cwd();
const source = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'm0b2b-cutover-'));
const backupFile = join(temporaryDirectory, 'verified-backup.sql');
const backupContents = 'verified backup fixture';
writeFileSync(backupFile, backupContents);
const backupHash = createHash('sha256')
  .update(backupContents)
  .digest('hex');

const safeEnvironment: RuntimeCutoverEnvironment = {
  NODE_ENV: 'development',
  DB_HOST: 'localhost',
  DB_NAME: 'tasiburada_dev',
  ALLOW_M0B_DESTRUCTIVE_CUTOVER: 'true',
  CONFIRM_M0B_CUTOVER_DATABASE: 'tasiburada_dev',
  CONFIRM_M0B_DESTRUCTIVE_ACTION: 'DROP_AND_RECREATE_tasiburada_dev',
  CONFIRM_M0B_BACKUP_SHA256: backupHash,
  CONFIRM_M0B_BACKUP_RESTORE_VERIFIED: 'true',
  M0B_BACKUP_FILE: backupFile,
};

afterAll(() => {
  unlinkSync(backupFile);
  rmdirSync(temporaryDirectory);
});

describe('M0B-2B runtime canonical cutover', () => {
  it('keeps the baseline first in the explicit canonical registry', () => {
    const runtimeSource = source(
      'src/infrastructure/database/data-source.ts',
    );
    expect(CANONICAL_MIGRATIONS[0]).toBe(
      CanonicalBaselineV11784500000000,
    );
    expect(CANONICAL_MIGRATION_NAME).toBe(
      'CanonicalBaselineV11784500000000',
    );
    expect(runtimeSource).toContain('CANONICAL_MIGRATIONS');
    expect(runtimeSource).not.toMatch(
      /database\/migrations|migrationPatterns|migrations\/\*/,
    );
    expect(runtimeSource).toContain('synchronize: false');
    expect(runtimeSource).toContain('migrationsRun: false');
  });

  it('sets client and every runtime pool session to UTC without global SQL', () => {
    const runtimeSource = source(
      'src/infrastructure/database/data-source.ts',
    );
    expect(runtimeSource).toContain("timezone: '+00:00'");
    expect(runtimeSource).toContain(
      "SET SESSION time_zone = '+00:00'",
    );
    expect(runtimeSource).toContain("pool.on('connection'");
    expect(runtimeSource).not.toMatch(/SET\s+GLOBAL/i);
  });

  it('accepts only a restored, external backup with exact confirmations', () => {
    const result = assertRuntimeCutoverSafety(safeEnvironment, root);
    expect(result.databaseName).toBe('tasiburada_dev');
    expect(result.backupSha256).toBe(backupHash);
    expect(result.backupBytes).toBeGreaterThan(0);
  });

  it.each([
    ['environment', { NODE_ENV: 'test' }],
    ['remote host', { DB_HOST: 'db.example.com' }],
    ['database', { DB_NAME: 'tasiburada_staging' }],
    ['permission', { ALLOW_M0B_DESTRUCTIVE_CUTOVER: 'false' }],
    ['database confirmation', { CONFIRM_M0B_CUTOVER_DATABASE: 'other' }],
    ['action confirmation', { CONFIRM_M0B_DESTRUCTIVE_ACTION: 'DROP' }],
    ['restore verification', { CONFIRM_M0B_BACKUP_RESTORE_VERIFIED: 'false' }],
    ['hash confirmation', { CONFIRM_M0B_BACKUP_SHA256: '0'.repeat(64) }],
    ['backup file', { M0B_BACKUP_FILE: `${backupFile}.missing` }],
  ])('rejects invalid %s before mutation', (_label, override) => {
    expect(() =>
      assertRuntimeCutoverSafety(
        { ...safeEnvironment, ...override },
        root,
      ),
    ).toThrow('M0B destructive cutover safety check failed:');
  });

  it('runs the destructive guard before creating a server connection', async () => {
    const connectionFactory = jest.fn(
      async () => ({} as Connection),
    );
    await expect(
      executeRuntimeCutoverReset(
        {
          ...safeEnvironment,
          CONFIRM_M0B_BACKUP_RESTORE_VERIFIED: 'false',
        },
        connectionFactory,
      ),
    ).rejects.toThrow('backup restore must be verified');
    expect(connectionFactory).not.toHaveBeenCalled();
  });

  it('keeps baseline, manifest and V2 schema scope immutable', () => {
    const migrationSource = source(
      'src/infrastructure/database/canonical-migrations/1784500000000-CanonicalBaselineV1.ts',
    );
    const manifest = JSON.parse(
      source('docs/database/canonical-v1-schema-manifest.json'),
    ) as CanonicalSchemaManifest;
    expect(migrationSource).toContain(
      'CanonicalBaselineV11784500000000',
    );
    expect(manifest.schemaFingerprint).toBe(
      'aa1812462c5127d612194c223eda2c52bd07f309a15df91ac7b1849f4561bab1',
    );

    const implementation = [
      source('src/infrastructure/database/data-source.ts'),
      source(
        'src/infrastructure/database/canonical/canonicalMigrationRegistry.ts',
      ),
      source(
        'src/infrastructure/database/canonical/runtimeCutoverSafety.ts',
      ),
      source(
        'src/infrastructure/database/canonical/runtimeCutoverExecute.ts',
      ),
    ].join('\n');
    [
      'shipment_rounds',
      'access_purchases',
      'slot_reservations',
      'payment_attempts',
      'credit_ledger_entries',
    ].forEach(name => expect(implementation).not.toContain(name));
  });
});
