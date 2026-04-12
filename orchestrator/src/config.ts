import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../../');
export const STORE_DIR = path.join(ROOT_DIR, 'store');

export const PATHS = {
  STATE: path.join(STORE_DIR, 'state.json'),
  BACKLOG: path.join(STORE_DIR, 'backlog.json'),
  JOBS: path.join(STORE_DIR, 'jobs'),
  ARTIFACTS: path.join(STORE_DIR, 'artifacts'),
  LOGS: path.join(STORE_DIR, 'logs'),
  RUNTIME: path.join(STORE_DIR, 'runtime'),
  ACTIVE_JOB: path.join(STORE_DIR, 'runtime', 'active-job.json'),
};

export const CONFIG = {
  WATCH_INTERVAL_MS: 1000,
  LOG_FILE: path.join(PATHS.LOGS, 'orchestrator.log'),
  EXECUTOR: {
    COMMAND: process.env.CLAUDE_EXECUTOR_COMMAND || 'npx @anthropic-ai/claude-code',
    ARGS: process.env.CLAUDE_EXECUTOR_ARGS?.split(' ') || ['--job'],
    TIMEOUT_MS: parseInt(process.env.CLAUDE_EXECUTOR_TIMEOUT_MS || '300000', 10),
  },
  PLANNER: {
    MODE: (process.env.PLANNER_MODE as 'local_rule_engine' | 'antigravity') || 'local_rule_engine',
    TIMEOUT_MS: parseInt(process.env.PLANNER_TIMEOUT_MS || '30000', 10),
  },
  GOVERNANCE: {
    MAX_REVISIONS: 2,
    STUCK_THRESHOLD: 10,
  }
};
