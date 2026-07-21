import { config } from 'dotenv';
import { runRuntimeCutoverPreflight } from './runtimeCutoverPreflight';

config();

const main = async (): Promise<void> => {
  const result = await runRuntimeCutoverPreflight(process.env);
  console.log(`Cutover preflight status: ${result.status}`);
  console.log(`Host class: ${result.hostClass}`);
  console.log(`Database: ${result.databaseName}`);
  if (result.gitBranch) console.log(`Git branch: ${result.gitBranch}`);
  if (result.gitHead) console.log(`Git HEAD: ${result.gitHead}`);
  if (result.mysqlVersion) console.log(`MySQL version: ${result.mysqlVersion}`);
  if (result.characterSet && result.collation) {
    console.log(
      `Database charset/collation: ${result.characterSet}/${result.collation}`,
    );
  }
  if (result.sessionTimezone && result.globalTimezone) {
    console.log(
      `Timezone session/global: ${result.sessionTimezone}/${result.globalTimezone}`,
    );
  }
  if (result.schemaFingerprint) {
    console.log(`Schema fingerprint: ${result.schemaFingerprint}`);
  }
  if (result.appliedMigrationCount !== undefined) {
    console.log(`Applied migration count: ${result.appliedMigrationCount}`);
  }
  if (result.approximateRowCounts) {
    console.log(
      `Approximate table rows: ${JSON.stringify(result.approximateRowCounts)}`,
    );
  }
  console.log(`Seeded/fake data status: ${result.seededDataStatus}`);
  console.log(result.note);
  if (result.status !== 'READY_FOR_EXPLICIT_DESTRUCTIVE_APPROVAL') {
    process.exitCode = 1;
  }
};

void main();
