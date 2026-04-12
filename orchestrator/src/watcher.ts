import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG } from './config.js';
import { readState, writeState, updateState } from './state.js';
import { readArtifact } from './artifact-reader.js';
import { determineNextJob, saveJobToFile } from './next-job.js';
import { handoffToExecutor } from './executor.js';
import { updateJobStatus } from './backlog.js';

export class OrchestratorWatcher {
  private isProcessing = false;
  private processedArtifacts = new Set<string>();

  async start() {
    console.log('Orchestrator MVP Watcher started.');
    console.log(`Monitoring: ${PATHS.ARTIFACTS}`);

    // Load already processed artifacts from state
    const state = await readState();
    if (state.processed_artifacts) {
      state.processed_artifacts.forEach(a => this.processedArtifacts.add(a));
      console.log(`Loaded ${this.processedArtifacts.size} processed artifacts from state.`);
    }

    // Initial check for existing artifacts
    await this.checkArtifacts();

    // Watch for new files
    // On Windows, fs.watch is more reliable for directories
    fs.watch(PATHS.ARTIFACTS, (eventType, filename) => {
      if (eventType === 'rename' && filename && filename.endsWith('-result.json')) {
        this.checkArtifacts().catch(console.error);
      }
    });
  }

  private async checkArtifacts() {
    if (this.isProcessing) return;

    const state = await readState();
    if (state.paused) {
      console.log('[WATCHER] Orchestrator is currently PAUSED. Skipping artifact check.');
      return;
    }

    const files = await fs.promises.readdir(PATHS.ARTIFACTS);
    const newFiles = files.filter(f => f.endsWith('-result.json') && !this.processedArtifacts.has(f));

    if (newFiles.length === 0) return;

    this.isProcessing = true;
    for (const filename of newFiles) {
      console.log(`[WATCHER] New artifact detected: ${filename}`);
      await this.processArtifact(filename);
      this.processedArtifacts.add(filename);
    }
    this.isProcessing = false;
  }

  private async processArtifact(filename: string) {
    const artifact = await readArtifact(filename);
    if (!artifact) {
      await this.quarantineArtifact(filename);
      return;
    }

    const state = await readState();
    
    // Determine next job
    const nextJob = await determineNextJob(artifact, state);
    
    if (nextJob) {
      // Update state with next job and mark artifact as processed
      await updateState({
        last_completed_job: artifact.job_id,
        active_job: nextJob.job_id,
        last_verdict: artifact.verdict,
        active_risk_level: nextJob.risk_level,
        next_job_candidate: nextJob.job_id,
      }, filename);

      // Save job file
      const jobPath = await saveJobToFile(nextJob);
      
      // Update status in backlog
      await updateJobStatus(nextJob.job_id, nextJob.status);

      // Handoff to executor bridge
      await handoffToExecutor(nextJob);
    } else {
      console.log('[WATCHER] No more jobs found in backlog or loop complete.');
      await updateState({
        last_completed_job: artifact.job_id,
        active_job: null,
        last_verdict: artifact.verdict,
        active_risk_level: null,
        next_job_candidate: null
      }, filename);
    }
  }

  private async quarantineArtifact(filename: string) {
    console.error(`[WATCHER] QUARANTINING invalid artifact: ${filename}`);
    const sourcePath = path.join(PATHS.ARTIFACTS, filename);
    const quarantineDir = path.join(PATHS.ARTIFACTS, 'invalid');
    const destPath = path.join(quarantineDir, filename);

    try {
      if (!fs.existsSync(quarantineDir)) {
        await fs.promises.mkdir(quarantineDir, { recursive: true });
      }
      await fs.promises.rename(sourcePath, destPath);
      console.log(`[WATCHER] Artifact moved to: ${destPath}`);
    } catch (e: any) {
      console.error(`[WATCHER] Failed to quarantine artifact ${filename}: ${e.message}`);
      // Fallback: rename in place if move fails
      try {
        await fs.promises.rename(sourcePath, `${sourcePath}.invalid`);
      } catch (innerE) {}
    }
  }
}
