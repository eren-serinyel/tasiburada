export type JobStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'ready_for_execution' | 'blocked' | 'failed_permanently';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Verdict = 'pass' | 'fail' | 'needs_revision';

export interface Job {
  job_id: string;
  parent_job_id?: string;
  title: string;
  priority: number;
  risk_level: RiskLevel;
  depends_on: string[];
  status: JobStatus;
  rationale: string;
  context?: string;
  agent?: string;
  input_artifacts?: string[];
  revision_count?: number;
  planner_metadata?: {
    decision_reason: string;
    loop_risk_score?: number;
    fallback_used?: boolean;
    revision_source?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Artifact {
  artifact_id: string;
  job_id: string;
  verdict: Verdict;
  summary: string;
  details?: any;
  created_at: string;
}

export interface State {
  current_phase: number;
  planner: string;
  executor: string;
  paused: boolean;
  last_completed_job: string | null;
  active_job: string | null;
  last_verdict: Verdict | null;
  active_risk_level: RiskLevel | null;
  next_job_candidate: string | null;
  last_processed_artifact: string | null;
  processed_artifacts: string[];
  updated_at: string | null;
}

export interface Backlog {
  jobs: Job[];
}

export interface PlannerInput {
  artifact: Artifact;
  state: State;
  backlog: Backlog;
  last_job?: Job;
}

export type PlannerMode = 'local_rule_engine' | 'antigravity';
