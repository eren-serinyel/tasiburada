import fs from 'fs/promises';
import { PATHS } from './config.js';
import { Job } from './types.js';

export async function handoffToExecutor(job: Job): Promise<void> {
  console.log('--------------------------------------------------');
  console.log(`[ORCHESTRATOR] HANDOFF READY for Job: ${job.job_id}`);
  console.log(`[ORCHESTRATOR] Title: ${job.title}`);
  
  // Ensure runtime directory exists
  try {
    const fsSync = await import('fs');
    if (!fsSync.existsSync(PATHS.RUNTIME)) {
      await fs.mkdir(PATHS.RUNTIME, { recursive: true });
    }
  } catch (e) {}

  const handoffData = {
    job_id: job.job_id,
    title: job.title,
    status: job.status,
    updated_at: job.updated_at || new Date().toISOString(),
    handoff_at: new Date().toISOString()
  };

  await fs.writeFile(PATHS.ACTIVE_JOB, JSON.stringify(handoffData, null, 2), 'utf8');
  
  console.log(`[ORCHESTRATOR] active-job.json updated. Job ${job.job_id} is pending execution.`);
  console.log('--------------------------------------------------');
}
