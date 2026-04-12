import { Job, PlannerInput } from '../types.js';

export interface Planner {
  name: string;
  plan(input: PlannerInput): Promise<Job | null>;
}
