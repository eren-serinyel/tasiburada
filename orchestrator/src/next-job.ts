import fs from 'fs/promises';
import path from 'path';
import { PATHS, CONFIG } from './config.js';
import { Artifact, Job, State, Planner, PlannerInput } from './types.js';
import { addJobToBacklog, readBacklog, updateJobStatus } from './backlog.js';
import { LocalRulePlanner } from './planners/local-rule-planner.js';
import { AntigravityPlanner } from './planners/antigravity-planner.js';
import { GovernanceEngine } from './governance.js';

export async function determineNextJob(artifact: Artifact, state: State): Promise<Job | null> {
  const backlog = await readBacklog();
  const lastJob = backlog.jobs.find(j => j.job_id === artifact.job_id);
  
  const input: PlannerInput = {
    artifact,
    state,
    backlog,
    last_job: lastJob
  };

  const mode = CONFIG.PLANNER.MODE;
  let planner: any;
  
  if (mode === 'antigravity') {
    planner = new AntigravityPlanner();
  } else {
    planner = new LocalRulePlanner();
  }

  console.log(`[ORCHESTRATOR] Selected Planner: ${planner.name}`);

  try {
    // 1. Plan next job candidate
    const candidate = await planner.plan(input);
    
    if (!candidate) return null;

    // 2. Governance check
    const govResult = GovernanceEngine.checkRevision(candidate, state, backlog);
    
    if (!govResult.allowed) {
      console.warn(`[GOVERNANCE] Revision DENIED for ${candidate.job_id}. Reason: ${govResult.reason}`);
      
      const finalStatus = govResult.action as 'blocked' | 'failed_permanently';
      
      // Update the original job or the planned one as terminal
      await updateJobStatus(artifact.job_id, finalStatus);
      
      // If blocked, we might want to flag the whole chain
      return null; 
    }

    // 3. Validation and Finalization
    if (!candidate.job_id || !candidate.title || !candidate.status) {
      throw new Error('Planner returned invalid job structure');
    }
    
    await addJobToBacklog(candidate);
    return candidate;
    
    return null;
  } catch (error: any) {
    if (mode === 'antigravity') {
      console.error(`[ORCHESTRATOR] Antigravity Planner failed: ${error.message}`);
      console.log(`[ORCHESTRATOR] Falling back to Local Rule Engine...`);
      
      const fallbackPlanner = new LocalRulePlanner();
      const fallbackResult = await fallbackPlanner.plan(input);
      
      if (fallbackResult) {
        await addJobToBacklog(fallbackResult);
        return fallbackResult;
      }
    } else {
      console.error(`[ORCHESTRATOR] Local Planner failed: ${error.message}`);
    }
    return null;
  }
}

export async function saveJobToFile(job: Job): Promise<string> {
  const filename = `${job.job_id}.json`;
  const fullPath = path.join(PATHS.JOBS, filename);
  await fs.writeFile(fullPath, JSON.stringify(job, null, 2), 'utf8');
  return fullPath;
}
