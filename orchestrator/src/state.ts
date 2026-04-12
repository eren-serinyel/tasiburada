import fs from 'fs/promises';
import { PATHS } from './config.js';
import { State } from './types.js';

function stripBOM(content: string): string {
  return content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
}

const LOCK_FILE = `${PATHS.STATE}.lock`;

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
  throw new Error(`Timeout acquiring lock for ${PATHS.STATE}`);
}

async function releaseLock() {
  try {
    await fs.unlink(LOCK_FILE);
  } catch (e) {}
}

export async function readState(): Promise<State> {
  await acquireLock();
  try {
    const data = await fs.readFile(PATHS.STATE, 'utf8');
    const state: State = JSON.parse(stripBOM(data));
    // Ensure new fields exist for backward compatibility
    if (!state.processed_artifacts) state.processed_artifacts = [];
    if (!state.last_processed_artifact) state.last_processed_artifact = null;
    return state;
  } finally {
    await releaseLock();
  }
}

export async function writeState(state: State): Promise<void> {
  await acquireLock();
  try {
    state.updated_at = new Date().toISOString();
    await fs.writeFile(PATHS.STATE, JSON.stringify(state, null, 2), 'utf8');
  } finally {
    await releaseLock();
  }
}

export async function updateState(updates: Partial<State>, processedFilename?: string): Promise<State> {
  const current = await readState();
  const updated = { ...current, ...updates };
  
  if (processedFilename && !updated.processed_artifacts.includes(processedFilename)) {
    updated.processed_artifacts.push(processedFilename);
    updated.last_processed_artifact = processedFilename;
  }

  await writeState(updated);
  return updated;
}
