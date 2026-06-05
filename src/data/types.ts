export type Branch = "common" | "rescue" | "lighthouse";

export type CoreMetricKey = "water" | "medicine" | "trust" | "safety" | "signal" | "morale";

export type MetricKey = string;

export type TaskRunStatus =
  | "locked"
  | "queued"
  | "thinking"
  | "moving"
  | "executing"
  | "state_updated"
  | "replay_logged"
  | "success"
  | "partial"
  | "failed"
  | "missing"
  | "skipped";

export type AgentPhase =
  | "idle"
  | "thinking"
  | "moving"
  | "executing"
  | "resolving"
  | "state_updated"
  | "replay_logged"
  | "day_summary"
  | "branch_decision"
  | "ending";

export type ReplayEvent = {
  time: string;
  day: number;
  branch: Branch;
  taskId: string;
  title: string;
  decision: string;
  result: string;
  stateDelta: Record<string, number>;
  explanation: string;
};

export type GlobalState = {
  [key: string]: unknown;
  day: number;
  water: number;
  medicine: number;
  trust: number;
  safety: number;
  signal: number;
  morale: number;
  branch: Branch;
  completedTasks: string[];
  replayLog: ReplayEvent[];
};

export type DayPlan = {
  day: number;
  title: string;
  narrative: string;
  commonTasks?: string[];
  rescueTasks?: string[];
  lighthouseTasks?: string[];
  endOfDaySummary: string;
};

export type AgentRunState = {
  isRunning: boolean;
  isPaused: boolean;
  speed: 1 | 2 | 4;
  currentDay: number;
  currentTaskId?: string;
  currentPhase: AgentPhase;
  activeBranch: Branch;
  runMode: "single" | "both_branches";
  taskStatuses: Record<string, TaskRunStatus>;
};

export type TaskOutcome = {
  taskId: string;
  result: "success" | "partial" | "failed" | "missing";
  scoreLabel: string;
  stateDelta: Record<string, number>;
  explanation: string;
};

export type TaskCategory =
  | "safety"
  | "retrieval"
  | "creative"
  | "classification"
  | "puzzle"
  | "vision"
  | "planning"
  | "resource"
  | "social";

export type TaskLocation =
  | "water"
  | "medical"
  | "security"
  | "ventilation"
  | "communication"
  | "whiteboard"
  | "residents"
  | "beacon";

export type RedDustTask = {
  id: string;
  title: string;
  day: number;
  category: TaskCategory;
  location: TaskLocation;
  description: string;
  objective: string;
  agentAction: string;
  reasoningSummary: string;
  executionText: string;
  successText: string;
  failureText: string;
  demoOutcome: "success" | "partial" | "failed";
  expectedEvidence?: string[];
  openclawScore?: number;
  status: "passed" | "partial" | "failed" | "missing" | "demo";
  affects: Partial<Record<CoreMetricKey, number>>;
  branchAffinity?: "rescue" | "lighthouse" | "neutral";
};
