import fs from 'fs';
import path from 'path';

let jobFilePath = process.argv[2];
if (jobFilePath === '--job') {
  jobFilePath = process.argv[3];
}

if (!jobFilePath) {
  console.error('No job file provided');
  process.exit(1);
}

const job = JSON.parse(fs.readFileSync(jobFilePath, 'utf8'));
const jobId = job.job_id;

let verdict = 'pass';
try {
  const config = JSON.parse(fs.readFileSync('test-config.json', 'utf8'));
  verdict = config.verdict || 'pass';
} catch (e) {}

console.log(`[TEST-EXECUTOR] Running job: ${jobId} (Verdict: ${verdict})`);

// Simulate work
const artifactPath = path.join(process.cwd(), '../store/artifacts', `${jobId}-result.json`);

const artifact = {
  artifact_id: `ART-${jobId}`,
  job_id: jobId,
  verdict: verdict,
  summary: `Test execution for ${jobId} finished with ${verdict}.`,
  created_at: new Date().toISOString()
};

fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
console.log(`[TEST-EXECUTOR] Artifact created at: ${artifactPath}`);

process.exit(0);
