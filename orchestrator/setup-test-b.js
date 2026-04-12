import fs from 'fs';
import path from 'path';

const storeDir = path.resolve('../store');
const jobsDir = path.join(storeDir, 'jobs');
const artifactsDir = path.join(storeDir, 'artifacts');
const runtimeDir = path.join(storeDir, 'runtime');

// Ensure directories
[jobsDir, artifactsDir, runtimeDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Clear existing items
[jobsDir, artifactsDir, runtimeDir].forEach(d => {
  if (fs.existsSync(d)) {
    fs.readdirSync(d).forEach(f => {
      const p = path.join(d, f);
      if (fs.statSync(p).isFile()) {
        try { fs.unlinkSync(p); } catch(e) {}
      }
    });
  }
});

// 1. Initial State
const state = {
  current_phase: 1,
  planner: 'local_rule_engine',
  executor: 'test',
  paused: false,
  processed_artifacts: []
};
fs.writeFileSync(path.join(storeDir, 'state.json'), JSON.stringify(state, null, 2));

// 2. Initial Job (already at max revisions)
const jobId = 'E2E-GOV-FIX';
const job = {
  job_id: jobId,
  title: 'E2E Governance Block Test',
  priority: 1,
  risk_level: 'medium',
  depends_on: [],
  status: 'ready_for_execution',
  rationale: 'Job at revision limit',
  revision_count: 2 // Assuming CONFIG.GOVERNANCE.MAX_REVISIONS is 2
};
fs.writeFileSync(path.join(jobsDir, `${jobId}.json`), JSON.stringify(job, null, 2));

// 3. Active Job
const active = {
  job_id: jobId,
  updated_at: new Date().toISOString(),
  status: 'ready_for_execution',
  title: 'E2E Governance Block Test'
};
fs.writeFileSync(path.join(runtimeDir, 'active-job.json'), JSON.stringify(active, null, 2));

// 4. Backlog
const backlog = {
  jobs: [
    {
      job_id: jobId,
      title: 'E2E Governance Block Test',
      status: 'ready_for_execution',
      priority: 1,
      risk_level: 'medium',
      depends_on: [],
      revision_count: 2
    }
  ]
};
fs.writeFileSync(path.join(storeDir, 'backlog.json'), JSON.stringify(backlog, null, 2));

// Added for E2E control
fs.writeFileSync('test-config.json', JSON.stringify({ verdict: 'fail' }));

console.log('Setup complete for Scenario B.');
