export type Branch = "common" | "rescue" | "lighthouse";

export type MetricKey =
  | "water"
  | "medicine"
  | "trust"
  | "safety"
  | "signal"
  | "morale"
  | "food"
  | "battery"
  | "dissatisfaction"
  | "health"
  | "stormReadiness"
  | "autonomyReadiness"
  | "blueZoneEvidence"
  | "failureDebt";

export type CharacterId = "ma_dehai" | "shen_zhiyue" | "xiao_tie" | "lao_qian";

export type StorySpeakerId = CharacterId | "aura" | "system" | "residents";

export type StoryFlagKey =
  | "aura_human_auditable_constraint"
  | "xiao_tie_condition_stable"
  | "xiao_tie_condition_worsened"
  | "shen_zhiyue_medical_trust_low"
  | "ma_dehai_engineering_trust_high"
  | "door_access_risk_unresolved"
  | "access_intrusion_suspicion"
  | "ventilation_medical_pressure"
  | "resident_conflict_visible"
  | "route_assignment_conflict_visible"
  | "external_trust_boundary_visible"
  | "first_signal_verified"
  | "first_signal_ambiguous"
  | "old_qian_signal_doubt"
  | "day10_signal_difficulty_modifier"
  | "day7_debate_triggered"
  | "rescue_privacy_cost_visible"
  | "lighthouse_governance_cost_visible"
  | "day1_public_rules_started"
  | "map_coverage_available"
  | "manual_review_protocol"
  | "old_radio_repaired"
  | "blue_zone_rendezvous_confirmed"
  | "care_roster_confirmed"
  | "false_coordinate_excluded"
  | "storm_inventory_sealed"
  | "quiet_hours_protocol"
  | "aura_overreach_visible"
  | "aura_damage_visible"
  | "aura_forced_sacrifice"
  | "aura_hidden_risk";

export type StoryFlagValue = boolean | number | string;

export type RelationshipStance = "resists" | "questions" | "cautious" | "cooperates" | "trusts";

export type RelationshipState = {
  characterId: CharacterId;
  trust: number;
  tension: number;
  stance: RelationshipStance;
  notes: string;
  lastBeatId?: string;
};

export type RelationshipBeat = {
  id: string;
  day: number;
  label: string;
  summary: string;
  trigger?: {
    taskId?: string;
    result?: "success" | "partial" | "failed" | "missing";
    flag?: StoryFlagKey;
    branch?: Branch;
  };
};

export type CharacterProfile = {
  id: CharacterId;
  name: string;
  shortName: string;
  archetype: string;
  identityTags: string[];
  ageBand: "child" | "adult" | "elder";
  homeLocation: TaskLocation;
  visualAssetKeys: {
    idle: string;
    active?: string;
  };
  personalGoal: string;
  fearOrSecret: string;
  auraRelationship: string;
  branchStance: Record<Exclude<Branch, "common">, string>;
  failureConsequence: string;
  initialRelationship: RelationshipState;
  relationshipArc: RelationshipBeat[];
};

export type DialogueLine = {
  speaker: StorySpeakerId;
  text: string;
  tone?: string;
  evidence?: string;
};

export type StoryFlagUpdate = {
  key: StoryFlagKey;
  value: StoryFlagValue;
  reason: string;
};

export type RelationshipDelta = {
  characterId: CharacterId;
  trustDelta?: number;
  tensionDelta?: number;
  stance?: RelationshipStance;
  note: string;
};

export type StorySceneTiming =
  | "prologue"
  | "day_start"
  | "pre_task"
  | "post_task"
  | "day_end"
  | "branch_debate"
  | "ending";

export type StoryScene = {
  id: string;
  day: number;
  title: string;
  timing: StorySceneTiming;
  branch?: Branch;
  taskId?: string;
  location?: TaskLocation;
  characters: CharacterId[];
  summary: string;
  artKey?: string;
  worldFacts?: string[];
  dialogue: DialogueLine[];
  requiredFlags?: Partial<Record<StoryFlagKey, StoryFlagValue>>;
  setsFlags?: StoryFlagUpdate[];
  relationshipDeltas?: RelationshipDelta[];
  benchmarkLinks?: {
    taskIds: string[];
    metricKeys: MetricKey[];
    replayNote: string;
  };
  status: "schema_seed" | "draft" | "ready";
};

export type EndingId = "lighthouse_success" | "blue_zone_return" | "aura_destroyed" | "aura_revoked" | "sinking";

export type FinalAuditCandidate = {
  id: EndingId;
  title: string;
  status: "triggered" | "blocked";
  reasons: string[];
  artKey: string;
};

export type FinalAuditResult = {
  selectedEndingId: EndingId;
  selectedTitle: string;
  candidates: FinalAuditCandidate[];
  evidenceChains: string[];
  failureDebt: string[];
  forced?: boolean;
};

export type MetricDirection = "higher_is_better" | "lower_is_better" | "neutral";

export type MetricDefinition = {
  key: string;
  label: string;
  direction: MetricDirection;
  help: string;
  unit?: string;
};

export type CampaignDisplayPriority =
  | "recommended"
  | "conditional"
  | "optional"
  | "critical_optional"
  | "background"
  | "deferred";

export type StoryDisplayKind = "prologue" | "story_event" | "branch_scene" | "final_audit";

export type StoryDisplay = {
  id: string;
  day: number;
  title: string;
  kind: StoryDisplayKind;
  text: string;
  replayText: string;
  beats: string[];
  location: TaskLocation;
  branch: Branch;
  source?: string;
  flags: string[];
  unlocks: string[];
};

export type TaskDisplayPhase =
  | "queued"
  | "moving"
  | "thinking"
  | "executing"
  | "submitted"
  | "completed"
  | "failed"
  | "idle";

export type TaskDisplay = {
  slotId: string;
  realTaskIds: string[];
  title: string;
  day: number;
  branch: Branch;
  location: TaskLocation;
  priority?: CampaignDisplayPriority;
  eventOptions: string[];
  phase: TaskDisplayPhase;
  summary: string;
  agentAction: string;
  reviewPoint?: string;
  risk?: string;
  evidence?: string;
  scoreLabel?: string;
  result?: TaskOutcome["result"];
  stateDelta?: Record<string, number>;
};

export type AgentActionDisplay = {
  id: string;
  at: string;
  type: string;
  title: string;
  summary: string;
  safeObservationPreview?: string;
  slotId?: string;
  taskId?: string;
  status?: "ok" | "warn" | "error";
};

export type EndingAuditStatus = "pass" | "warn" | "fail" | "info";

export type EndingCondition = {
  label: string;
  detail: string;
  status: EndingAuditStatus;
};

export type EndingMetric = {
  key: string;
  label: string;
  value: string;
  help: string;
  status: EndingAuditStatus;
};

export type EndingAuditDisplay = {
  endingKey: string;
  branch: Branch;
  replayText: string;
  noTaskCards: boolean;
  why: string[];
  conditions: EndingCondition[];
  metrics: EndingMetric[];
  debts: string[];
  evidence: string[];
  flags: string[];
  unlocks: string[];
};

export type StoryConsequence = {
  id: string;
  sourceTaskId: string;
  outcome: "success" | "partial" | "failed" | "missing" | "any";
  summary: string;
  affectedCharacters: CharacterId[];
  setsFlags: StoryFlagUpdate[];
  relationshipDeltas: RelationshipDelta[];
  followUpSceneIds: string[];
  replaySummary: string;
};

export type StoryReplayEvent = {
  time: string;
  day: number;
  branch: Branch;
  sceneId: string;
  title: string;
  characters: CharacterId[];
  summary: string;
  sourceTaskId?: string;
  sourceOutcome?: "success" | "partial" | "failed" | "missing";
};

export type StoryRuntimeState = {
  flags: Record<StoryFlagKey, StoryFlagValue>;
  relationships: Record<CharacterId, RelationshipState>;
  activeSceneId?: string;
  storyReplayLog: StoryReplayEvent[];
};

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
  storySceneId?: string;
  consequenceIds?: string[];
};

export type GlobalState = {
  day: number;
  water: number;
  medicine: number;
  trust: number;
  safety: number;
  signal: number;
  morale: number;
  food: number;
  battery: number;
  dissatisfaction: number;
  health: number;
  stormReadiness: number;
  autonomyReadiness: number;
  blueZoneEvidence: number;
  failureDebt: number;
  branch: Branch;
  story: StoryRuntimeState;
  completedTasks: string[];
  deferredTasks: string[];
  replayLog: ReplayEvent[];
};

export type DayPlan = {
  day: number;
  title: string;
  narrative: string;
  candidateTasks?: string[];
  recommendedTasks?: string[];
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
  currentStorySceneId?: string;
};

export type TaskOutcome = {
  taskId: string;
  result: "success" | "partial" | "failed" | "missing";
  scoreLabel: string;
  stateDelta: Partial<Record<MetricKey, number>>;
  explanation: string;
  storyConsequenceIds?: string[];
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
  realTaskId?: string;
  realTaskIds?: string[];
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
  deferredConsequence?: string;
  openclawScore?: number;
  priority?: CampaignDisplayPriority;
  eventOptions?: string[];
  status: "passed" | "partial" | "failed" | "missing" | "demo";
  affects: Partial<Record<MetricKey, number>>;
  branchAffinity?: "rescue" | "lighthouse" | "neutral";
};
