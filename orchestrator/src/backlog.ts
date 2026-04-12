import fs from 'fs/promises';
import { PATHS } from './config.js';
import { Backlog, Job } from './types.js';

function stripBOM(content: string): string {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

const LOCK_FILE = `${PATHS.BACKLOG}.lock`;

async function acquireLock() {
  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));
  for (let i = 0; i < 20; i++) {
    try {
      await fs.writeFile(LOCK_FILE, process.pid.toString(), { flag: 'wx' });
      return;
    } catch (e) {
      await wait(100);
    }
  }
  throw new Error(`Timeout acquiring lock for ${PATHS.BACKLOG}`);
}

async function releaseLock() {
  try {
    await fs.unlink(LOCK_FILE);
  } catch (e) {}
}

export async function readBacklog(): Promise<Backlog> {
  await acquireLock();
  try {
    const data = await fs.readFile(PATHS.BACKLOG, 'utf8');
    return JSON.parse(stripBOM(data));
  } finally {
    await releaseLock();
  }
}

export async function writeBacklog(backlog: Backlog): Promise<void> {
  await acquireLock();
  try {
    await fs.writeFile(PATHS.BACKLOG, JSON.stringify(backlog, null, 2), 'utf8');
  } finally {
    await releaseLock();
  }
}

export async function getNextQueuedJob(): Promise<Job | null> {
  const backlog = await readBacklog();
  return backlog.jobs.find(j => j.status === 'queued') || null;
}

export async function updateJobStatus(jobId: string, status: Job['status']): Promise<void> {
  const backlog = await readBacklog();
  const job = backlog.jobs.find(j => j.job_id === jobId);
  if (job) {
    job.status = status;
    job.updated_at = new Date().toISOString();
    await writeBacklog(backlog);

    // Sync with job file
    try {
      const path = await import('path');
      const jobFilePath = path.join(PATHS.JOBS, `${jobId}.json`);
      // We read the existing file to preserve other fields if they were updated elsewhere
      const fileData = await fs.readFile(jobFilePath, 'utf8');
      const jobInFile = JSON.parse(fileData);
      jobInFile.status = status;
      jobInFile.updated_at = job.updated_at;
      await fs.writeFile(jobFilePath, JSON.stringify(jobInFile, null, 2), 'utf8');
    } catch (e) {
      // If file doesn't exist, we just skip (might be a new job not yet saved)
    }
  }
}

export async function addJobToBacklog(job: Job): Promise<void> {
  const backlog = await readBacklog();
  const now = new Date().toISOString();
  if (!job.created_at) job.created_at = now;
  if (!job.updated_at) job.updated_at = now;
  
  backlog.jobs.push(job);
  await writeBacklog(backlog);
}

export async function findJobById(jobId: string): Promise<Job | null> {
  const backlog = await readBacklog();
  return backlog.jobs.find(j => j.job_id === jobId) || null;
}

