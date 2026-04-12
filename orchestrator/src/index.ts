import { OrchestratorWatcher } from './watcher.js';
import { readState } from './state.js';
import { CONFIG } from './config.js';

async function main() {
  console.log('--- Taşıburada Orchestrator MVP ---');
  
  try {
    const state = await readState();
    console.log(`Current Phase: ${state.current_phase}`);
    console.log(`Planner: ${CONFIG.PLANNER.MODE}`);
    console.log(`Executor: ${state.executor}`);
    console.log(`Paused: ${state.paused}`);
    console.log('---------------------------------');

    const watcher = new OrchestratorWatcher();
    await watcher.start();
  } catch (error) {
    console.error('Failed to start orchestrator:', error);
    process.exit(1);
  }
}

main();
