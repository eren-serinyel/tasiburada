import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { PATHS, CONFIG } from './config.js';
import { readState, updateState } from './state.js';
import { readBacklog } from './backlog.js';
import { Job } from './types.js';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === 'help') {
    printHelp();
    return;
  }

  try {
    switch (command) {
      case 'pause':
        await pauseOrchestrator();
        break;
      case 'resume':
        await resumeOrchestrator();
        break;
      case 'status':
        await showStatus();
        break;
      case 'active-job':
        await showActiveJob();
        break;
      case 'backlog':
        await showBacklog();
        break;
      case 'blocked':
        await showJobsByStatus('blocked');
        break;
      case 'failures':
        await showJobsByStatus('failed', 'failed_permanently');
        break;
      case 'job':
        if (!args[0]) {
          console.error(chalk.red('Error: Job ID is required.'));
          process.exit(1);
        }
        await inspectJob(args[0]);
        break;
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        printHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
}

function printHelp() {
  console.log(chalk.bold('\nTaşıburada Operator CLI'));
  console.log('Usage: npm run operator <command> [args]\n');
  console.log('Commands:');
  console.log('  pause           - Pause the orchestrator');
  console.log('  resume          - Resume the orchestrator');
  console.log('  status          - Show runtime summary');
  console.log('  active-job      - Show details of the currently active job');
  console.log('  backlog         - List all jobs in the backlog');
  console.log('  blocked         - List all blocked jobs');
  console.log('  failures        - List all failed jobs');
  console.log('  job <id>        - Inspect a specific job by ID');
  console.log('  help            - Show this help message\n');
}

async function pauseOrchestrator() {
  await updateState({ paused: true });
  console.log(chalk.yellow('⏸ Orchestrator PAUSED.'));
}

async function resumeOrchestrator() {
  await updateState({ paused: false });
  console.log(chalk.green('▶ Orchestrator RESUMED.'));
}

async function showStatus() {
  const state = await readState();
  const backlog = await readBacklog();

  const blockedCount = backlog.jobs.filter(j => j.status === 'blocked').length;
  const failedCount = backlog.jobs.filter(j => 
    j.status === 'failed' || 
    j.status === 'failed_permanently'
  ).length;

  console.log(chalk.bold('\n--- Orchestrator Status Summary ---'));
  console.log(`Planner Mode:       ${chalk.cyan(CONFIG.PLANNER.MODE)}`);
  console.log(`Executor Mode:      ${chalk.cyan(CONFIG.EXECUTOR.COMMAND)}`);
  console.log(`Paused:             ${state.paused ? chalk.yellow('YES') : chalk.green('NO')}`);
  console.log(`Active Job:         ${state.active_job ? chalk.yellow(state.active_job) : 'None'}`);
  console.log(`Last Completed:     ${state.last_completed_job ? chalk.green(state.last_completed_job) : 'None'}`);
  console.log(`Last Verdict:       ${formatVerdict(state.last_verdict)}`);
  console.log(`Governance:         ${blockedCount > 0 || failedCount > 0 ? chalk.red('ACTION REQUIRED') : chalk.green('STABLE')}`);
  console.log(`Blocked Jobs:       ${blockedCount > 0 ? chalk.red(blockedCount) : chalk.green(0)}`);
  console.log(`Failed (Perm):      ${failedCount > 0 ? chalk.red(failedCount) : chalk.green(0)}`);
  console.log(`Updated At:         ${state.updated_at || 'Never'}`);
  console.log('------------------------------------\n');
}

async function showActiveJob() {
  try {
    const data = await fs.readFile(PATHS.ACTIVE_JOB, 'utf8');
    if (!data.trim()) {
      console.log('No active job file found or it is empty.');
      return;
    }
    const activeJob = JSON.parse(data);
    console.log(chalk.bold('\n--- Active Job ---'));
    console.log(`ID:         ${chalk.yellow(activeJob.job_id)}`);
    console.log(`Title:      ${activeJob.title}`);
    console.log(`Status:     ${formatStatus(activeJob.status)}`);
    console.log(`Updated:    ${activeJob.updated_at}`);
    if (activeJob.failure_reason) {
      console.log(`Failure:    ${chalk.red(activeJob.failure_reason)}`);
    }
    console.log('------------------\n');
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      console.log('No active job currently.');
    } else {
      throw e;
    }
  }
}

async function showBacklog() {
  const backlog = await readBacklog();
  console.log(chalk.bold(`\n--- Backlog (${backlog.jobs.length} jobs) ---`));
  console.log('ID\t\t\tStatus\t\tTitle');
  backlog.jobs.forEach(j => {
    console.log(`${j.job_id.slice(0, 8)}...\t${formatStatus(j.status).padEnd(20)}\t${j.title}`);
  });
  console.log('------------------------------------\n');
}

async function showJobsByStatus(...statuses: string[]) {
  const backlog = await readBacklog();
  const filtered = backlog.jobs.filter(j => statuses.includes(j.status));
  
  console.log(chalk.bold(`\n--- Jobs with status: ${statuses.join(', ')} (${filtered.length}) ---`));
  if (filtered.length === 0) {
    console.log('None found.');
    return;
  }
  
  console.log('ID\t\t\tStatus\t\tTitle');
  filtered.forEach(j => {
    console.log(`${j.job_id.slice(0, 8)}...\t${formatStatus(j.status).padEnd(20)}\t${j.title}`);
  });
  console.log('------------------------------------\n');
}

async function inspectJob(jobId: string) {
  const backlog = await readBacklog();
  const job = backlog.jobs.find(j => j.job_id === jobId || j.job_id.startsWith(jobId));
  
  if (!job) {
    console.log(chalk.red(`Job ${jobId} not found in backlog.`));
    return;
  }

  console.log(chalk.bold(`\n--- Job Inspection: ${job.job_id} ---`));
  console.log(`Title:      ${job.title}`);
  console.log(`Status:     ${formatStatus(job.status)}`);
  console.log(`Risk Level: ${job.risk_level}`);
  console.log(`Priority:   ${job.priority}`);
  console.log(`Rationale:  ${job.rationale}`);
  
  if (job.parent_job_id) {
    console.log(`Parent:     ${chalk.cyan(job.parent_job_id)}`);
    await showRevisionChain(job.job_id, backlog.jobs);
  }

  // Show artifact if exists
  const artifactPath = path.join(PATHS.ARTIFACTS, `${job.job_id}-result.json`);
  try {
    const artData = await fs.readFile(artifactPath, 'utf8');
    const artifact = JSON.parse(artData);
    console.log(chalk.bold('\n--- Most Recent Artifact ---'));
    console.log(`Verdict:    ${formatVerdict(artifact.verdict)}`);
    console.log(`Summary:    ${artifact.summary}`);
  } catch (e) {}

  console.log('------------------------------------\n');
}

async function showRevisionChain(jobId: string, allJobs: Job[]) {
  const chain: string[] = [];
  let current: Job | undefined = allJobs.find(j => j.job_id === jobId);
  
  while (current && current.parent_job_id) {
    const parentId = current.parent_job_id;
    chain.push(parentId);
    current = allJobs.find(j => j.job_id === parentId);
  }

  if (chain.length > 0) {
    console.log(chalk.bold('\n--- Revision Chain ---'));
    console.log(`Current: ${jobId}`);
    chain.forEach((id, index) => {
      console.log(`  ^ [${index + 1}] ${id}`);
    });
  }
}

function formatStatus(status: string) {
  switch (status) {
    case 'queued': return chalk.gray(status);
    case 'in_progress': return chalk.blue(status);
    case 'completed': return chalk.green(status);
    case 'failed': return chalk.red(status);
    case 'failed_permanently': return chalk.bgRed.white(status);
    case 'blocked': return chalk.yellow(status);
    case 'ready_for_execution': return chalk.magenta(status);
    default: return status;
  }
}

function formatVerdict(verdict: string | null) {
  if (!verdict) return 'None';
  switch (verdict) {
    case 'pass': return chalk.green(verdict);
    case 'fail': return chalk.red(verdict);
    case 'needs_revision': return chalk.yellow(verdict);
    default: return verdict;
  }
}

main().catch(console.error);
