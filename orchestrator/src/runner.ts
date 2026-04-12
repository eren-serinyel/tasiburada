import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { PATHS, CONFIG } from './config.js';
import { Job } from './types.js';
import { updateJobStatus } from './backlog.js';

function stripBOM(content: string): string {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

export class ExecutorRunner {
  private lastPickedJobId: string | null = null;
  private lastPickedUpdatedAt: string | null = null;
  private isProcessing = false;

  async start() {
    console.log('--------------------------------------------------');
    console.log('Executor Runner started.');
    console.log(`Watching for active job at: ${PATHS.ACTIVE_JOB}`);
    console.log(`Configured Command: ${CONFIG.EXECUTOR.COMMAND} ${CONFIG.EXECUTOR.ARGS.join(' ')}`);
    console.log('--------------------------------------------------');

    setInterval(() => {
      this.poll().catch(console.error);
    }, 2000);
  }

  private async poll() {
    if (this.isProcessing) return;

    try {
      const { readState } = await import('./state.js');
      const state = await readState();
      if (state.paused) {
        return;
      }

      const stats = await fs.stat(PATHS.ACTIVE_JOB);
      if (!stats.isFile()) return;

      const data = await fs.readFile(PATHS.ACTIVE_JOB, 'utf8');
      if (!data.trim()) return;

      const activeJobInfo = JSON.parse(stripBOM(data));
      const { job_id, updated_at, status } = activeJobInfo;

      if (job_id === this.lastPickedJobId && updated_at === this.lastPickedUpdatedAt) {
        return;
      }

      if (status !== 'ready_for_execution') {
        return;
      }

      this.isProcessing = true;
      this.lastPickedJobId = job_id;
      this.lastPickedUpdatedAt = updated_at;

      console.log(`[RUNNER] Picking up Job: ${job_id} (Title: ${activeJobInfo.title})`);
      
      await this.processJob(job_id);

      this.isProcessing = false;
    } catch (e: any) {
      if (e.code !== 'ENOENT') {
        console.error(`[RUNNER] Error polling active job: ${e.message}`);
      }
    }
  }

  private async processJob(jobId: string) {
    const jobFilePath = path.join(PATHS.JOBS, `${jobId}.json`);
    
    try {
      const jobData = await fs.readFile(jobFilePath, 'utf8');
      const job: Job = JSON.parse(jobData);

      console.log(`[RUNNER] Updating status to: in_progress`);
      job.status = 'in_progress';
      job.updated_at = new Date().toISOString();
      await fs.writeFile(jobFilePath, JSON.stringify(job, null, 2), 'utf8');
      await updateJobStatus(jobId, 'in_progress');

      const activeJobData = JSON.parse(await fs.readFile(PATHS.ACTIVE_JOB, 'utf8'));
      activeJobData.status = 'in_progress';
      activeJobData.claimed_at = new Date().toISOString();
      await fs.writeFile(PATHS.ACTIVE_JOB, JSON.stringify(activeJobData, null, 2), 'utf8');

      // --- Real Execution Bridge ---
      console.log(`[RUNNER] Starting real execution for Job: ${jobId}`);
      const { exitCode, error } = await this.runExecutor(jobId, jobFilePath);

      let finalStatus: Job['status'] = 'completed';
      let failureReason = '';

      if (error) {
        finalStatus = 'failed';
        failureReason = error;
      } else if (exitCode !== 0) {
        finalStatus = 'failed';
        failureReason = `Executor exited with non-zero code: ${exitCode}`;
      } else {
        // Exit code was 0, now validate artifact
        const artifactRes = await this.validateArtifact(jobId);
        if (!artifactRes.valid) {
          finalStatus = 'failed';
          failureReason = artifactRes.reason || 'Invalid or missing artifact';
        }
      }

      console.log(`[RUNNER] Execution finished. Final Decision: ${finalStatus}`);
      if (failureReason) console.log(`[RUNNER] Reason: ${failureReason}`);

      // --- Finalization ---
      job.status = finalStatus;
      job.updated_at = new Date().toISOString();
      await fs.writeFile(jobFilePath, JSON.stringify(job, null, 2), 'utf8');
      await updateJobStatus(jobId, finalStatus);

      activeJobData.status = finalStatus;
      activeJobData.completed_at = job.updated_at;
      activeJobData.failure_reason = failureReason || undefined;
      await fs.writeFile(PATHS.ACTIVE_JOB, JSON.stringify(activeJobData, null, 2), 'utf8');

      console.log(`[RUNNER] Job ${jobId} finalized.`);
      console.log('--------------------------------------------------');

    } catch (e: any) {
      console.error(`[RUNNER] Error processing job ${jobId}: ${e.message}`);
      await updateJobStatus(jobId, 'failed').catch(() => {});
    }
  }

  private async runExecutor(jobId: string, jobFilePath: string): Promise<{ exitCode: number | null; error?: string }> {
    const stdoutLogPath = path.join(PATHS.LOGS, `${jobId}-stdout.log`);
    const stderrLogPath = path.join(PATHS.LOGS, `${jobId}-stderr.log`);

    const stdoutStream = createWriteStream(stdoutLogPath);
    const stderrStream = createWriteStream(stderrLogPath);

    return new Promise((resolve) => {
      const command = CONFIG.EXECUTOR.COMMAND;
      const args = [...CONFIG.EXECUTOR.ARGS, jobFilePath];

      console.log(`[RUNNER] Spawning: ${command} ${args.join(' ')}`);

      // Use shell: true for Windows and npx resolution
      const child = spawn(command, args, { shell: true, windowsHide: true });

      child.stdout.pipe(stdoutStream);
      child.stderr.pipe(stderrStream);

      const timeout = setTimeout(() => {
        child.kill();
        resolve({ exitCode: null, error: 'Execution timed out' });
      }, CONFIG.EXECUTOR.TIMEOUT_MS);

      child.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ exitCode: null, error: `Process error: ${err.message}` });
      });

      child.on('close', (code) => {
        clearTimeout(timeout);
        resolve({ exitCode: code });
      });
    });
  }

  private async validateArtifact(jobId: string): Promise<{ valid: boolean; reason?: string }> {
    const artifactPath = path.join(PATHS.ARTIFACTS, `${jobId}-result.json`);
    
    try {
      const stats = await fs.stat(artifactPath);
      if (!stats.isFile()) {
        return { valid: false, reason: `Artifact file not found at ${artifactPath}` };
      }

      const data = await fs.readFile(artifactPath, 'utf8');
      JSON.parse(data); // Validate JSON

      return { valid: true };
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return { valid: false, reason: `Artifact file missing: ${artifactPath}` };
      }
      return { valid: false, reason: `Invalid JSON in artifact: ${e.message}` };
    }
  }
}

// Main entry point
const runner = new ExecutorRunner();
runner.start().catch(console.error);
