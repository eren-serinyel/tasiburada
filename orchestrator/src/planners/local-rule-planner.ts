import fs from 'fs/promises';
import path from 'path';
import { PATHS } from '../config.js';
import { Job, PlannerInput } from '../types.js';
import { Planner } from './interface.js';
import { getNextQueuedJob, updateJobStatus } from '../backlog.js';

export class LocalRulePlanner implements Planner {
  name = 'local_rule_engine';

  async plan(input: PlannerInput): Promise<Job | null> {
    const { artifact, backlog } = input;
    const { verdict, job_id } = artifact;
    const reason = artifact.summary || (artifact as any).next_recommended_action || 'No summary provided';

    if (verdict === 'pass') {
      console.log(`[LOCAL-PLANNER] Job ${job_id} passed. Moving to next queued job.`);
      await updateJobStatus(job_id, 'completed');
      const nextJob = await getNextQueuedJob();
      if (nextJob) {
        nextJob.status = 'ready_for_execution';
      }
      return nextJob;
    }

    if (verdict === 'fail' || verdict === 'needs_revision') {
      console.log(`[LOCAL-PLANNER] Job ${job_id} ${verdict === 'fail' ? 'failed' : 'needs revision'}. Creating revision job.`);
      
      let originalJob = backlog.jobs.find(j => j.job_id === job_id);
      
      if (!originalJob) {
        try {
          const jobFilePath = path.join(PATHS.JOBS, `${job_id}.json`);
          const jobData = await fs.readFile(jobFilePath, 'utf8');
          originalJob = JSON.parse(jobData);
        } catch (e) {}
      }

      const titleSuffix = originalJob?.title || artifact.summary?.split('\n')[0] || `Fix for ${job_id}`;
      const now = new Date().toISOString();
      const nextRevisionCount = (originalJob?.revision_count || 0) + 1;
      
      const revisionJob: Job = {
        job_id: `${job_id}-R${nextRevisionCount}`,
        parent_job_id: job_id,
        title: `REVISION: ${titleSuffix}`,
        priority: (originalJob?.priority || 1) + 1,
        risk_level: originalJob?.risk_level || 'medium',
        depends_on: [job_id],
        status: 'ready_for_execution',
        rationale: `Revision triggered by ${verdict}: ${reason}`,
        context: originalJob?.context,
        agent: originalJob?.agent || 'claude-3-5-sonnet',
        input_artifacts: [artifact.artifact_id],
        revision_count: nextRevisionCount,
        planner_metadata: {
          decision_reason: `Local rules triggered revision due to ${verdict}.`,
          revision_source: 'local_rule_engine'
        },
        created_at: now,
        updated_at: now
      };

      return revisionJob;
    }

    return null;
  }
}
