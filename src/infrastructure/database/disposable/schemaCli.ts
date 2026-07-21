import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import {
  diffSchemaManifests,
  diffSchemaProvenance,
  fingerprintSchemaManifest,
  stableStringify,
  type CanonicalSchemaManifest,
} from './schemaManifest';
import {
  inspectCanonicalSchema,
  readOnlySchemaConnectionOptionsFromEnvironment,
} from './schemaIntrospection';

config();

const MANIFEST_PATH = resolve(
  process.cwd(),
  'docs/database/canonical-v1-schema-manifest.json',
);

const exportManifest = async (): Promise<void> => {
  const options = readOnlySchemaConnectionOptionsFromEnvironment(process.env);
  const manifest = await inspectCanonicalSchema(options);
  writeFileSync(MANIFEST_PATH, stableStringify(manifest), {
    encoding: 'utf8',
  });
  console.log(`Canonical schema fingerprint: ${manifest.schemaFingerprint}`);
  console.log(`Canonical schema tables: ${manifest.tables.length}`);
  console.log(`Applied migration records: ${manifest.migrations.length}`);
};

const verifyManifest = async (): Promise<void> => {
  const stored = JSON.parse(
    readFileSync(MANIFEST_PATH, 'utf8'),
  ) as CanonicalSchemaManifest;
  const storedFingerprint = fingerprintSchemaManifest(stored);
  if (stored.schemaFingerprint !== storedFingerprint) {
    console.error('Canonical schema verification: DIFFERENT');
    console.error('- stored manifest fingerprint is invalid');
    process.exitCode = 1;
    return;
  }

  const options = readOnlySchemaConnectionOptionsFromEnvironment(process.env);
  const current = await inspectCanonicalSchema(options);
  const schemaDifferences = diffSchemaManifests(stored, current);
  const provenanceDifferences = diffSchemaProvenance(stored, current);

  if (schemaDifferences.length > 0) {
    console.error('Canonical schema verification: DIFFERENT');
    schemaDifferences.slice(0, 25).forEach(difference =>
      console.error(`- ${difference}`),
    );
    if (schemaDifferences.length > 25) {
      console.error(
        `- ${schemaDifferences.length - 25} additional differences`,
      );
    }
    process.exitCode = 1;
  } else {
    console.log('Canonical schema verification: MATCH');
    console.log(`Canonical schema fingerprint: ${current.schemaFingerprint}`);
  }

  if (provenanceDifferences.length === 0) {
    console.log('Canonical provenance verification: MATCH');
    return;
  }

  console.warn('Canonical provenance verification: DIFFERENT (warning)');
  provenanceDifferences.slice(0, 25).forEach(difference =>
    console.warn(`- ${difference}`),
  );
  if (provenanceDifferences.length > 25) {
    console.warn(
      `- ${provenanceDifferences.length - 25} additional differences`,
    );
  }
};

const main = async (): Promise<void> => {
  const command = process.argv[2];
  if (command === 'export') {
    await exportManifest();
    return;
  }
  if (command === 'verify') {
    await verifyManifest();
    return;
  }

  throw new Error('Schema command must be "export" or "verify"');
};

main().catch(() => {
  console.error(
    'Schema command failed: read-only schema inspection did not complete.',
  );
  process.exitCode = 1;
});
