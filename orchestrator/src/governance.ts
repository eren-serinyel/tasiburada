import { Job, State, Backlog } from './types.js';
import { CONFIG } from './config.js';

export interface GovernanceResult {
  allowed: boolean;
  action: 'proceed' | 'block' | 'failed_permanently';
  reason?: string;
  risk_score: number;
}

export class GovernanceEngine {
  static checkRevision(job: Job, state: State, backlog: Backlog): GovernanceResult {
    const revisionCount = job.revision_count || 0;
    
    // Rule 1: Revision Cap
    if (revisionCount >= CONFIG.GOVERNANCE.MAX_REVISIONS) {
      return {
        allowed: false,
        action: 'failed_permanently',
        reason: `Maximum revision limit reached (${CONFIG.GOVERNANCE.MAX_REVISIONS}) for job family.`,
        risk_score: 100
      };
    }

    // Rule 2: Stuck Detection (Repeated failures of the same family)
    // We look for jobs with the same title or parent chain that failed N times in a row
    const familyJobs = backlog.jobs.filter(j => 
      j.job_id === job.job_id || 
      j.parent_job_id === job.job_id ||
      j.parent_job_id === job.parent_job_id
    );

    const consecutiveFailures = familyJobs.filter(j => j.status === 'failed' || j.status === 'failed_permanently').length;

    if (consecutiveFailures >= CONFIG.GOVERNANCE.STUCK_THRESHOLD) {
      return {
        allowed: false,
        action: 'block',
        reason: `Stuck detected: ${consecutiveFailures} consecutive failures in this job family.`,
        risk_score: 90
      };
    }

    // Rule 3: Global Pause check (redundant but safe)
    if (state.paused) {
      return {
        allowed: false,
        action: 'block',
        reason: 'Orchestrator is currently paused.',
        risk_score: 0
      };
    }

    return {
      allowed: true,
      action: 'proceed',
      risk_score: revisionCount * 20 // Risk increases with revision count
    };
  }
}
