import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { DisposableDatabaseEnvironment } from '../disposable/disposableDatabaseSafety';
import {
  inspectCanonicalSchema,
  readOnlySchemaConnectionOptionsFromEnvironment,
} from '../disposable/schemaIntrospection';
import {
  diffSchemaManifests,
  diffSchemaProvenance,
  fingerprintSchemaManifest,
  type CanonicalSchemaManifest,
} from '../disposable/schemaManifest';
import { canonicalDatabaseNameFromEnvironment } from './canonicalDataSource';

const MANIFEST_PATH = resolve(
  process.cwd(),
  'docs/database/canonical-v1-schema-manifest.json',
);

export interface CanonicalSchemaCounts {
  readonly tables: number;
  readonly columns: number;
  readonly indexes: number;
  readonly foreignKeys: number;
  readonly uniqueConstraints: number;
  readonly checkConstraints: number;
}

export interface CanonicalVerificationResult {
  readonly stored: CanonicalSchemaManifest;
  readonly current: CanonicalSchemaManifest;
  readonly counts: CanonicalSchemaCounts;
  readonly schemaDifferences: string[];
  readonly provenanceDifferences: string[];
}

export const countCanonicalSchema = (
  manifest: CanonicalSchemaManifest,
): CanonicalSchemaCounts => ({
  tables: manifest.tables.length,
  columns: manifest.tables.reduce(
    (count, table) => count + table.columns.length,
    0,
  ),
  indexes: manifest.tables.reduce(
    (count, table) => count + table.indexes.length,
    0,
  ),
  foreignKeys: manifest.tables.reduce(
    (count, table) => count + table.foreignKeys.length,
    0,
  ),
  uniqueConstraints: manifest.tables.reduce(
    (count, table) => count + table.uniqueConstraints.length,
    0,
  ),
  checkConstraints: manifest.tables.reduce(
    (count, table) => count + table.checkConstraints.length,
    0,
  ),
});

export const verifyCanonicalDatabase = async (
  env: DisposableDatabaseEnvironment = process.env,
): Promise<CanonicalVerificationResult> => {
  const stored = JSON.parse(
    readFileSync(MANIFEST_PATH, 'utf8'),
  ) as CanonicalSchemaManifest;
  if (stored.schemaFingerprint !== fingerprintSchemaManifest(stored)) {
    throw new Error('Canonical verification failed: stored fingerprint invalid');
  }

  const target = canonicalDatabaseNameFromEnvironment(env);
  const options = readOnlySchemaConnectionOptionsFromEnvironment({
    ...env,
    DB_NAME: target,
  });
  const current = await inspectCanonicalSchema(options);

  return {
    stored,
    current,
    counts: countCanonicalSchema(current),
    schemaDifferences: diffSchemaManifests(stored, current),
    provenanceDifferences: diffSchemaProvenance(stored, current),
  };
};
