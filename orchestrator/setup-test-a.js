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

// 2. Initial Job
const jobId = 'E2E-START';
const job = {
  job_id: jobId,
  title: 'E2E Successful Sequence Test',
  priority: 1,
  risk_level: 'low',
  depends_on: [],
  status: 'ready_for_execution',
  rationale: 'Seed job for E2E validation'
};
fs.writeFileSync(path.join(jobsDir, `${jobId}.json`), JSON.stringify(job, null, 2));

// 3. Active Job
const active = {
  job_id: jobId,
  updated_at: new Date().toISOString(),
  status: 'ready_for_execution',
  title: 'E2E Successful Sequence Test'
};
fs.writeFileSync(path.join(runtimeDir, 'active-job.json'), JSON.stringify(active, null, 2));

// 4. Backlog
const backlog = {
  jobs: [
    {
      job_id: jobId,
      title: 'E2E Successful Sequence Test',
      status: 'ready_for_execution',
      priority: 1,
      risk_level: 'low',
      depends_on: []
    }
  ]
};
fs.writeFileSync(path.join(storeDir, 'backlog.json'), JSON.stringify(backlog, null, 2));

fs.writeFileSync('test-config.json', JSON.stringify({ verdict: 'pass' }));

console.log('Setup complete for Scenario A.');
