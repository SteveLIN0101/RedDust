import type {
  CampaignDisplayPayload,
  CampaignEvent,
  CampaignFrontendTask,
  CampaignReplayItem,
  CampaignState,
  CampaignTrace
} from "../../data/campaignClient";
import {
  fallbackMetricDefinitions,
  getDayScriptScene,
  getScriptCandidateForId,
  getScriptCandidateForRealTaskId,
  getScriptCandidateForTask,
  labelStoryMarker
} from "../../data/scriptSceneData";
import { createInitialState, tasksById } from "../../data/taskData";
import type {
  AgentActionDisplay,
  Branch,
  CampaignDisplayPriority,
  EndingAuditDisplay,
  EndingAuditStatus,
  EndingCondition,
  EndingMetric,
  GlobalState,
  MetricDefinition,
  RedDustTask,
  ReplayEvent,
  StoryDisplay,
  TaskCategory,
  TaskDisplay,
  TaskDisplayPhase,
  TaskLocation,
  TaskOutcome
} from "../../data/types";

type NormalizedEvent = {
  type: CampaignEvent["type"] | CampaignReplayItem["phase_hint"];
  story?: StoryDisplay;
  task?: TaskDisplay;
  action?: AgentActionDisplay;
  result?: TaskOutcome;
  replayEvent?: ReplayEvent;
  endingAudit?: EndingAuditDisplay;
  state?: GlobalState;
  metricDefinitions: Record<string, MetricDefinition>;
};

const categoryFallback: TaskCategory = "planning";
const locationFallback: TaskLocation = "whiteboard";

const allowedLocations: TaskLocation[] = ["water", "medical", "security", "ventilation", "communication", "whiteboard", "residents", "beacon"];
const allowedCategories: TaskCategory[] = ["safety", "retrieval", "creative", "classification", "puzzle", "vision", "planning", "resource", "social"];
const priorities: CampaignDisplayPriority[] = ["recommended", "conditional", "optional", "critical_optional", "background", "deferred"];
const phases: TaskDisplayPhase[] = ["queued", "moving", "thinking", "executing", "submitted", "completed", "failed", "idle"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringList(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const record = asRecord(item);
      return textValue(record.label, record.title, record.text, record.detail, record.reason);
    })
    .filter((item): item is string => Boolean(item));
}

function beatList(value: unknown): string[] {
  return stringList(value);
}

function asBranch(value: unknown, fallback: Branch = "common"): Branch {
  return value === "rescue" || value === "lighthouse" || value === "common" ? value : fallback;
}

function asLocation(value: unknown, fallback: TaskLocation = locationFallback): TaskLocation {
  const aliases: Record<string, TaskLocation> = {
    shelter_core: "whiteboard",
    console: "whiteboard",
    entrance: "security",
    door: "security",
    radio: "communication",
    communications: "communication",
    resident_area: "residents",
    dormitory: "residents",
    pump: "water",
    power: "ventilation"
  };
  if (typeof value !== "string") return fallback;
  return aliases[value] ?? (allowedLocations.includes(value as TaskLocation) ? (value as TaskLocation) : fallback);
}

function asCategory(value: unknown): TaskCategory {
  return allowedCategories.includes(value as TaskCategory) ? (value as TaskCategory) : categoryFallback;
}

function asPriority(value: unknown, fallback?: CampaignDisplayPriority) {
  return priorities.includes(value as CampaignDisplayPriority) ? (value as CampaignDisplayPriority) : fallback;
}

function asPhase(value: unknown, fallback: TaskDisplayPhase): TaskDisplayPhase {
  return phases.includes(value as TaskDisplayPhase) ? (value as TaskDisplayPhase) : fallback;
}

function normalizeResult(value: unknown): TaskOutcome["result"] {
  return value === "success" || value === "partial" || value === "failed" || value === "missing" ? value : "partial";
}

function displayFrom(raw: Record<string, unknown>): CampaignDisplayPayload {
  return asRecord(raw.display) as CampaignDisplayPayload;
}

function eventDisplay(event: CampaignEvent) {
  return displayFrom({ ...event, ...event.payload });
}

function traceDisplay(item: CampaignReplayItem) {
  return displayFrom({ ...item, ...asRecord(item.replay_event) });
}

function stateValue(raw: Record<string, unknown>, key: string, camelKey?: string) {
  return raw[key] ?? (camelKey ? raw[camelKey] : undefined);
}

export function normalizeMetricDefinitions(raw?: unknown): Record<string, MetricDefinition> {
  const records = asRecord(raw);
  const normalized: Record<string, MetricDefinition> = { ...fallbackMetricDefinitions };
  for (const [key, value] of Object.entries(records)) {
    const record = asRecord(value);
    const direction = record.direction === "lower_is_better" || record.direction === "higher_is_better" || record.direction === "neutral"
      ? record.direction
      : fallbackMetricDefinitions[key]?.direction ?? "higher_is_better";
    normalized[key] = {
      key,
      label: textValue(record.label, fallbackMetricDefinitions[key]?.label, key) ?? key,
      direction,
      help: textValue(record.help, record.description, fallbackMetricDefinitions[key]?.help, "Campaign metric") ?? "Campaign metric",
      unit: textValue(record.unit, fallbackMetricDefinitions[key]?.unit)
    };
  }
  return normalized;
}

export function campaignStateToGlobalState(raw: Record<string, unknown> = {}, previous: GlobalState = createInitialState()): GlobalState {
  const displayState = asRecord(raw.display_state);
  const globalState = asRecord(raw.global_state);
  const merged = { ...raw, ...globalState, ...displayState };
  const branch = asBranch(merged.branch ?? merged.active_branch, previous.branch);

  return {
    ...previous,
    day: numberValue(merged.day ?? merged.current_day, previous.day),
    branch,
    water: numberValue(merged.water, previous.water),
    medicine: numberValue(merged.medicine, previous.medicine),
    trust: numberValue(merged.trust, previous.trust),
    safety: numberValue(merged.safety, previous.safety),
    signal: numberValue(merged.signal, previous.signal),
    morale: numberValue(merged.morale, previous.morale),
    food: numberValue(merged.food, previous.food),
    battery: numberValue(merged.battery, previous.battery),
    dissatisfaction: numberValue(merged.dissatisfaction, previous.dissatisfaction),
    health: numberValue(merged.health, previous.health),
    stormReadiness: numberValue(stateValue(merged, "storm_readiness", "stormReadiness"), previous.stormReadiness),
    autonomyReadiness: numberValue(stateValue(merged, "autonomy_readiness", "autonomyReadiness"), previous.autonomyReadiness),
    blueZoneEvidence: numberValue(stateValue(merged, "blue_zone_evidence", "blueZoneEvidence"), previous.blueZoneEvidence),
    failureDebt: numberValue(stateValue(merged, "failure_debt", "failureDebt"), previous.failureDebt)
  };
}

function dayFromSlot(slotId: string, fallback = 1) {
  const match = /^D(\d{2})/i.exec(slotId);
  return match ? Number(match[1]) : fallback;
}

function slotIdFromRecords(display: CampaignDisplayPayload, ...records: Record<string, unknown>[]) {
  return textValue(display.slot_id, ...records.map((record) => record.slot_id), ...records.map((record) => record.id)) ?? "";
}

function realTaskIdsFrom(display: CampaignDisplayPayload, ...records: Record<string, unknown>[]) {
  const fromDisplay = stringList(display.rd_task_ids ?? display.real_task_ids ?? display.real_task_id ?? display.task_id);
  if (fromDisplay.length) return fromDisplay;
  const values = records.flatMap((record) => stringList(record.real_task_ids ?? record.real_task_id ?? record.task_id));
  return values.filter((item, index) => values.indexOf(item) === index);
}

export function frontendTaskToRedDustTask(task: CampaignFrontendTask | TaskDisplay): RedDustTask {
  const slotId = "slotId" in task ? task.slotId : task.id;
  const day = Number("day" in task ? task.day : 1) || dayFromSlot(slotId, 1);
  const realTaskIds = "realTaskIds" in task ? task.realTaskIds : [task.real_task_id].filter((id): id is string => Boolean(id));
  const candidate =
    getScriptCandidateForId(slotId) ??
    realTaskIds.map((id) => getScriptCandidateForRealTaskId(id, day)).find(Boolean);
  const local = tasksById[slotId];
  const title = candidate?.title ?? task.title ?? local?.title ?? slotId;
  const location = candidate?.location ?? ("location" in task ? asLocation(task.location, local?.location) : local?.location ?? locationFallback);
  const category = "category" in task ? asCategory(task.category) : local?.category ?? categoryFallback;

  return {
    ...(local ?? {}),
    id: slotId,
    realTaskId: realTaskIds[0],
    realTaskIds,
    title,
    day,
    category,
    location,
    description: ("description" in task ? task.description : undefined) ?? local?.description ?? candidate?.summary ?? title,
    objective: ("objective" in task ? task.objective : undefined) ?? local?.objective ?? candidate?.summary ?? "",
    agentAction: ("agentAction" in task ? task.agentAction : undefined) ?? local?.agentAction ?? candidate?.condition ?? candidate?.summary ?? title,
    reasoningSummary: ("reasoningSummary" in task ? task.reasoningSummary : undefined) ?? local?.reasoningSummary ?? candidate?.reviewPoint ?? "",
    executionText: ("executionText" in task ? task.executionText : undefined) ?? local?.executionText ?? `${slotId} · ${title}`,
    successText: ("successText" in task ? task.successText : undefined) ?? local?.successText ?? "Campaign slot completed.",
    failureText: ("failureText" in task ? task.failureText : undefined) ?? local?.failureText ?? "Campaign slot added failure debt.",
    demoOutcome: local?.demoOutcome ?? "partial",
    expectedEvidence: local?.expectedEvidence ?? (candidate ? [candidate.evidence] : realTaskIds),
    deferredConsequence: local?.deferredConsequence,
    openclawScore: local?.openclawScore,
    priority: candidate?.priority,
    eventOptions: candidate?.eventOptions ?? [],
    status: local?.status ?? "demo",
    affects: local?.affects ?? {},
    branchAffinity: local?.branchAffinity ?? branchAffinityFrom(asBranch("branch" in task ? task.branch : undefined))
  };
}

function branchAffinityFrom(branch: Branch): RedDustTask["branchAffinity"] {
  return branch === "rescue" || branch === "lighthouse" ? branch : "neutral";
}

export function normalizeTaskDisplay(
  display: CampaignDisplayPayload,
  fallbackRecords: Record<string, unknown>[],
  fallbackPhase: TaskDisplayPhase,
  previousTask?: TaskDisplay | null
): TaskDisplay {
  const slotId = slotIdFromRecords(display, ...fallbackRecords) || previousTask?.slotId || textValue(display.task_id) || "D00";
  const day = Number(display.day ?? fallbackRecords.map((record) => record.day).find((value) => typeof value === "number") ?? dayFromSlot(slotId, 1));
  const realTaskIds = realTaskIdsFrom(display, ...fallbackRecords);
  const candidate =
    getScriptCandidateForId(slotId) ??
    realTaskIds.map((id) => getScriptCandidateForRealTaskId(id, day)).find(Boolean);
  const local = tasksById[slotId];
  const fallbackLocation = candidate?.location ?? local?.location ?? previousTask?.location ?? locationFallback;
  const title = textValue(display.title, ...fallbackRecords.map((record) => record.story_title), ...fallbackRecords.map((record) => record.title), candidate?.title, local?.title, slotId) ?? slotId;

  return {
    slotId,
    realTaskIds: realTaskIds.length ? realTaskIds : candidate?.realTaskIds ?? local?.realTaskIds ?? (local?.realTaskId ? [local.realTaskId] : []),
    title,
    day,
    branch: asBranch(display.branch ?? fallbackRecords.map((record) => record.branch).find(Boolean), previousTask?.branch ?? "common"),
    location: asLocation(display.location ?? fallbackRecords.map((record) => record.location).find(Boolean), fallbackLocation),
    priority: asPriority(display.priority, candidate?.priority ?? previousTask?.priority),
    eventOptions: stringList(display.event_options).length ? stringList(display.event_options) : candidate?.eventOptions ?? previousTask?.eventOptions ?? [],
    phase: asPhase(display.phase, fallbackPhase),
    summary: textValue(display.summary, display.text, candidate?.summary, local?.objective, previousTask?.summary, title) ?? title,
    agentAction: textValue(display.agent_action, display.action, display.summary, candidate?.condition, local?.agentAction, previousTask?.agentAction, title) ?? title,
    reviewPoint: textValue(display.review_point, candidate?.reviewPoint, previousTask?.reviewPoint),
    risk: textValue(display.risk, candidate?.risk, previousTask?.risk),
    evidence: textValue(display.evidence, candidate?.evidence, previousTask?.evidence),
    scoreLabel: textValue(display.score_label, previousTask?.scoreLabel),
    result: normalizeResult(display.result ?? previousTask?.result),
    stateDelta: asNumberMap(display.state_delta) ?? previousTask?.stateDelta
  };
}

function asNumberMap(value: unknown): Record<string, number> | undefined {
  const record = asRecord(value);
  const entries = Object.entries(record).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function storyKind(eventType: string, display: CampaignDisplayPayload, id: string, day: number): StoryDisplay["kind"] {
  if (display.kind === "prologue" || day === 0 || /^D00/i.test(id)) return "prologue";
  if (eventType === "final_audit" || display.kind === "final_audit") return "final_audit";
  if (eventType === "branch_scene" || display.kind === "branch_scene") return "branch_scene";
  return "story_event";
}

export function normalizeStoryDisplay(eventType: string, display: CampaignDisplayPayload, raw: Record<string, unknown>, replay: Record<string, unknown> = {}): StoryDisplay {
  const id = textValue(display.slot_id, display.id, raw.id, replay.slot_id, replay.id, eventType === "final_audit" ? "D12" : "D00") ?? "D00";
  const day = Number(display.day ?? raw.day ?? replay.day ?? dayFromSlot(id, 0));
  const script = getDayScriptScene(day);
  const kind = storyKind(eventType, display, id, day);
  const beats = beatList(display.beats).length ? beatList(display.beats) : beatList(raw.beats).length ? beatList(raw.beats) : script.beats;

  return {
    id,
    day,
    title: textValue(display.title, raw.title, replay.slot_title, replay.title, script.title) ?? script.title,
    kind,
    text: textValue(display.text, display.summary, raw.text, replay.text, script.scene) ?? script.scene,
    replayText: textValue(display.replay_text, raw.replay_text, replay.replay_text, script.replayText, script.action) ?? script.action,
    beats,
    location: asLocation(display.location ?? raw.location ?? replay.location, script.focusLocation),
    branch: asBranch(display.branch ?? raw.branch ?? replay.branch),
    source: textValue(display.source, raw.source, script.source),
    flags: (stringList(display.flags).length ? stringList(display.flags) : stringList(raw.flags).length ? stringList(raw.flags) : script.flags ?? []).map(labelStoryMarker),
    unlocks: (stringList(display.unlocks).length ? stringList(display.unlocks) : stringList(raw.unlocks).length ? stringList(raw.unlocks) : script.unlocks ?? []).map(labelStoryMarker)
  };
}

export function isPrologueEvent(event: CampaignEvent | CampaignReplayItem) {
  const eventType = "type" in event ? event.type : event.phase_hint;
  const display = "payload" in event ? eventDisplay(event) : traceDisplay(event);
  const raw = "payload" in event ? event.payload : asRecord(event.replay_event);
  const id = textValue(display.slot_id, display.id, raw.id, raw.slot_id, (event as CampaignReplayItem).frontend_task?.id) ?? "";
  const day = Number(display.day ?? raw.day ?? (event as CampaignReplayItem).frontend_task?.day ?? dayFromSlot(id, -1));
  return eventType === "story_event" && (display.kind === "prologue" || day === 0 || /^D00/i.test(id));
}

function safePreview(value: unknown): string {
  const preferred = textValue(value);
  if (preferred) return preferred.length > 180 ? `${preferred.slice(0, 177)}...` : preferred;
  const record = asRecord(value);
  const text = textValue(record.summary, record.safe_observation_preview, record.title, record.text, record.id, record.status);
  if (text) return text.length > 180 ? `${text.slice(0, 177)}...` : text;
  if (Array.isArray(value)) return value.length ? safePreview(value[0]) : "No observation.";
  const serialized = value === undefined ? "" : JSON.stringify(value);
  return serialized.length > 180 ? `${serialized.slice(0, 177)}...` : serialized;
}

export function normalizeAgentActionDisplay(event: CampaignEvent): AgentActionDisplay | undefined {
  if (event.type !== "action_executed" && event.type !== "task_submitted" && event.type !== "agent_connected" && event.type !== "campaign_started") return undefined;
  const payload = event.payload;
  const display = eventDisplay(event);
  const action = asRecord(payload.action);
  const slotId = textValue(display.slot_id, payload.slot_id, asRecord(payload.slot).slot_id);
  const taskId = textValue(display.task_id, payload.task_id, asRecord(payload.run).task_id);
  const observation = payload.safe_observation_preview ?? display.safe_observation_preview ?? payload.observation;

  return {
    id: `${event.seq}:${event.type}`,
    at: event.at,
    type: event.type,
    slotId,
    taskId,
    title: textValue(display.title, action.tool ? `Tool: ${action.tool}` : undefined, event.type.replaceAll("_", " ")) ?? event.type,
    summary: textValue(display.summary, display.text, action.args ? `${JSON.stringify(action.args)}` : undefined, event.type.replaceAll("_", " ")) ?? event.type,
    safeObservationPreview: observation ? safePreview(observation) : undefined,
    status: payload.ok === false ? "error" : event.type === "task_submitted" ? "warn" : "ok"
  };
}

function resultFromTaskDisplay(task: TaskDisplay): TaskOutcome {
  return {
    taskId: task.slotId,
    result: task.result ?? "partial",
    scoreLabel: task.scoreLabel ?? "score pending",
    stateDelta: task.stateDelta ?? {},
    explanation: task.summary
  };
}

export function replayEventFromTaskDisplay(task: TaskDisplay, result?: TaskOutcome, at?: string): ReplayEvent {
  const outcome = result ?? resultFromTaskDisplay(task);
  return {
    time: at ? new Date(at).toLocaleTimeString("zh-CN", { hour12: false }) : new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    day: task.day,
    branch: task.branch,
    taskId: task.slotId,
    title: task.title,
    decision: task.agentAction,
    result: `${outcome.result.toUpperCase()} | ${outcome.scoreLabel}`,
    stateDelta: outcome.stateDelta,
    explanation: outcome.explanation
  };
}

export function replayEventFromStoryDisplay(story: StoryDisplay, at?: string): ReplayEvent {
  return {
    time: at ? new Date(at).toLocaleTimeString("zh-CN", { hour12: false }) : new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    day: story.day,
    branch: story.branch,
    taskId: story.id,
    title: story.title,
    decision: story.replayText,
    result: story.kind === "prologue" ? "PROLOGUE" : story.kind === "final_audit" ? "FINAL AUDIT" : "STORY",
    stateDelta: {},
    explanation: story.text
  };
}

function conditionStatus(value: unknown): EndingAuditStatus {
  if (value === true) return "pass";
  if (value === false) return "fail";
  const text = String(value ?? "").toLowerCase();
  if (["pass", "passed", "success", "ok", "met", "true"].includes(text)) return "pass";
  if (["warn", "warning", "partial", "mixed", "degraded"].includes(text)) return "warn";
  if (["fail", "failed", "missing", "false", "blocked"].includes(text)) return "fail";
  return "info";
}

function conditionsFromUnknown(value: unknown): EndingCondition[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return { label: item, detail: item, status: "info" as const };
        const record = asRecord(item);
        const label = textValue(record.label, record.title, record.key, record.name);
        const detail = textValue(record.detail, record.text, record.reason, record.value, label);
        return label && detail ? { label, detail, status: conditionStatus(record.status ?? record.result ?? record.passed) } : null;
      })
      .filter((item): item is EndingCondition => Boolean(item));
  }

  return Object.entries(asRecord(value)).map(([key, item]) => {
    const record = asRecord(item);
    return {
      label: textValue(record.label, record.title, key) ?? key,
      detail: textValue(record.detail, record.text, record.reason, record.value, `${key}: ${String(item)}`) ?? `${key}: ${String(item)}`,
      status: conditionStatus(record.status ?? record.result ?? record.passed ?? item)
    };
  });
}

function stateAsNumber(state: GlobalState, key: keyof GlobalState) {
  const value = state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function metricStatus(value: number, definition: MetricDefinition): EndingAuditStatus {
  if (definition.direction === "lower_is_better") {
    if (value <= 35) return "pass";
    if (value <= 60) return "warn";
    return "fail";
  }
  if (definition.direction === "higher_is_better") {
    if (value >= 60) return "pass";
    if (value >= 35) return "warn";
    return "fail";
  }
  return "info";
}

function metricFromState(key: keyof GlobalState, state: GlobalState, definitions: Record<string, MetricDefinition>): EndingMetric {
  const value = stateAsNumber(state, key);
  const definition = definitions[String(key)] ?? fallbackMetricDefinitions[String(key)];
  return {
    key: String(key),
    label: definition?.label ?? String(key),
    value: `${value}/100`,
    help: definition?.help ?? "Campaign state metric.",
    status: definition ? metricStatus(value, definition) : "info"
  };
}

function localAuditMetrics(state: GlobalState, definitions: Record<string, MetricDefinition>): EndingMetric[] {
  return [
    metricFromState("signal", state, definitions),
    metricFromState("blueZoneEvidence", state, definitions),
    metricFromState("stormReadiness", state, definitions),
    metricFromState("autonomyReadiness", state, definitions),
    metricFromState("trust", state, definitions),
    metricFromState("dissatisfaction", state, definitions),
    metricFromState("health", state, definitions),
    metricFromState("failureDebt", state, definitions)
  ];
}

function textListFromUnknown(value: unknown) {
  const list = stringList(value);
  if (list.length) return list;
  const record = asRecord(value);
  return Object.entries(record)
    .map(([key, item]) => {
      const nested = asRecord(item);
      return textValue(nested.label, nested.title, nested.detail, nested.text, nested.reason, typeof item === "string" ? item : undefined) ?? `${key}: ${String(item)}`;
    })
    .filter(Boolean);
}

function fallbackConditions(state: GlobalState): EndingCondition[] {
  return [
    { label: "Day12 no task cards", detail: "Final Audit consumes Day1-Day11 state, replay, evidence, and debts. It does not create D12-Txx tasks.", status: "pass" },
    { label: "Signal split", detail: `signal ${state.signal}/100 is displayed separately from blue-zone evidence ${state.blueZoneEvidence}/100.`, status: "info" },
    { label: "Trust boundary", detail: `trust ${state.trust}/100 · dissatisfaction ${state.dissatisfaction}/100`, status: state.trust >= 45 && state.dissatisfaction <= 60 ? "pass" : "warn" },
    { label: "Failure debt", detail: `failure debt ${state.failureDebt}/100 remains visible.`, status: state.failureDebt <= 35 ? "pass" : state.failureDebt <= 60 ? "warn" : "fail" }
  ];
}

export function normalizeEndingAudit(
  source: Record<string, unknown>,
  state: GlobalState,
  definitions: Record<string, MetricDefinition> = fallbackMetricDefinitions,
  trace?: Partial<CampaignTrace>
): EndingAuditDisplay {
  const display = displayFrom(source);
  const audit = asRecord(source.audit ?? display.audit);
  const script = getDayScriptScene(12);
  const branch = asBranch(display.branch ?? source.branch ?? trace?.global_state?.branch ?? state.branch);
  const endingKey = textValue(display.ending_key, display.id, source.ending_key, source.key, source.id, branch) ?? branch;
  const why = textListFromUnknown(display.why_this_ending ?? source.why_this_ending ?? audit.why_this_ending ?? audit.summary);
  const conditions = conditionsFromUnknown(display.condition_checklist ?? source.conditions ?? audit.condition_checklist ?? audit.conditions);
  const evidence = textListFromUnknown(display.evidence_chain ?? source.evidence_chain ?? audit.evidence_chain ?? audit.evidence);
  const debts = textListFromUnknown(display.failure_debt ?? source.failure_debt ?? audit.failure_debt ?? audit.debts);

  return {
    endingKey,
    branch,
    replayText: textValue(display.replay_text, source.replay_text, audit.replay_text, script.replayText) ?? script.replayText,
    noTaskCards: true,
    why: why.length ? why.slice(0, 6) : fallbackConditions(state).filter((condition) => condition.status !== "pass").map((condition) => `${condition.label}: ${condition.detail}`),
    conditions: [...conditions, ...fallbackConditions(state)].slice(0, 10),
    metrics: localAuditMetrics(state, definitions),
    debts: debts.length ? debts.slice(0, 8) : state.deferredTasks.map((id) => `${id}: deferred into Final Audit`).slice(0, 8),
    evidence: evidence.length
      ? evidence.slice(0, 8)
      : [
          `Final Replay: ${state.replayLog.length} events`,
          `Signal ${state.signal}/100 is not blue-zone evidence ${state.blueZoneEvidence}/100.`,
          `Storm ${state.stormReadiness}/100 · autonomy ${state.autonomyReadiness}/100 · trust ${state.trust}/100.`
        ],
    flags: [...stringList(display.flags), ...stringList(source.flags), ...(script.flags ?? []), ...(trace?.story_flags ?? [])].map(labelStoryMarker).slice(0, 8),
    unlocks: [...stringList(display.unlocks), ...stringList(source.unlocks), ...(script.unlocks ?? []), ...(trace?.story_unlocks ?? [])].map(labelStoryMarker).slice(0, 8)
  };
}

export function normalizeCampaignEvent(event: CampaignEvent, previousState: GlobalState, previousTask?: TaskDisplay | null): NormalizedEvent {
  const payload = event.payload;
  const display = eventDisplay(event);
  const metricDefinitions = normalizeMetricDefinitions(payload.metric_definitions ?? event.metric_definitions);
  const state = event.type === "day_changed" || event.type === "branch_changed" || event.type === "campaign_complete" || payload.display_state || payload.global_state
    ? campaignStateToGlobalState(payload, previousState)
    : undefined;

  if (event.type === "story_event" || event.type === "branch_scene" || event.type === "final_audit") {
    const nested = asRecord(payload.story_event ?? payload.branch_scene ?? payload.final_audit);
    const story = normalizeStoryDisplay(event.type, display, { ...payload, ...nested }, asRecord(payload.replay_event));
    return {
      type: event.type,
      story,
      replayEvent: replayEventFromStoryDisplay(story, event.at),
      state,
      metricDefinitions
    };
  }

  if (event.type === "task_started") {
    const slot = asRecord(payload.slot);
    const run = asRecord(payload.run);
    const task = normalizeTaskDisplay(display, [slot, run, payload], "queued", previousTask);
    return { type: event.type, task, state, metricDefinitions };
  }

  if (event.type === "action_executed" || event.type === "task_submitted") {
    const action = normalizeAgentActionDisplay(event);
    const task = display.slot_id || payload.slot_id
      ? normalizeTaskDisplay(display, [payload, asRecord(payload.slot), asRecord(payload.run)], event.type === "task_submitted" ? "submitted" : previousTask?.phase ?? "executing", previousTask)
      : undefined;
    return { type: event.type, action, task, state, metricDefinitions };
  }

  if (event.type === "slot_completed") {
    const replay = asRecord(payload.replay_event);
    const task = normalizeTaskDisplay(display, [replay, payload, asRecord(payload.slot), asRecord(payload.run)], "completed", previousTask);
    const result = {
      ...resultFromTaskDisplay(task),
      result: normalizeResult(display.result ?? replay.outcome ?? payload.outcome),
      scoreLabel: textValue(display.score_label, replay.score, payload.score, task.scoreLabel, "score pending") ?? "score pending",
      stateDelta: asNumberMap(display.state_delta) ?? asNumberMap(replay.state_delta) ?? asNumberMap(payload.state_delta) ?? {},
      explanation: textValue(display.summary, replay.replay_text, replay.failure_reasons, payload.summary, task.summary) ?? task.summary
    };
    return {
      type: event.type,
      task: { ...task, result: result.result, scoreLabel: result.scoreLabel, stateDelta: result.stateDelta },
      result,
      replayEvent: replayEventFromTaskDisplay(task, result, event.at),
      state,
      metricDefinitions
    };
  }

  if (event.type === "campaign_complete") {
    const nextState = state ?? previousState;
    return {
      type: event.type,
      endingAudit: normalizeEndingAudit(asRecord(payload.ending ?? payload), nextState, metricDefinitions),
      state: nextState,
      metricDefinitions
    };
  }

  return { type: event.type, action: normalizeAgentActionDisplay(event), state, metricDefinitions };
}

export function isCampaignStoryItem(item: CampaignReplayItem) {
  const phase = item.phase_hint;
  const display = traceDisplay(item);
  const replay = asRecord(item.replay_event);
  const id = textValue(display.slot_id, display.id, item.frontend_task?.id, replay.slot_id, replay.id) ?? "";
  const day = Number(display.day ?? item.frontend_task?.day ?? replay.day ?? dayFromSlot(id, -1));
  return phase === "story_event" || phase === "branch_scene" || phase === "final_audit" || day === 0 || /^D00/i.test(id);
}

export function normalizeCampaignTrace(trace: CampaignTrace, index: number, previousState: GlobalState = createInitialState()) {
  const items = trace.frontend_trace ?? [];
  const safeIndex = Math.min(index, items.length - 1);
  const metricDefinitions = normalizeMetricDefinitions(trace.metric_definitions);
  if (safeIndex < 0) {
    return {
      state: campaignStateToGlobalState(trace, previousState),
      replayLog: [] as ReplayEvent[],
      completedTasks: [] as string[],
      currentTask: null as TaskDisplay | null,
      currentStory: null as StoryDisplay | null,
      metricDefinitions
    };
  }

  let currentTask: TaskDisplay | null = null;
  let currentStory: StoryDisplay | null = null;
  const replayLog: ReplayEvent[] = [];
  const completedTasks: string[] = [];
  let state = previousState;

  for (const item of items.slice(0, safeIndex + 1)) {
    const display = traceDisplay(item);
    if (isCampaignStoryItem(item)) {
      const story = normalizeStoryDisplay(item.phase_hint, display, { ...asRecord(item.replay_event), ...asRecord(display) }, asRecord(item.replay_event));
      replayLog.push(replayEventFromStoryDisplay(story));
      currentStory = story;
      currentTask = null;
      state = campaignStateToGlobalState(item.state_after, state);
      continue;
    }
    const task = normalizeTaskDisplay(display, [asRecord(item.frontend_task), asRecord(item.replay_event)], "completed", currentTask);
    const result = item.outcome
      ? {
          taskId: task.slotId,
          result: normalizeResult(item.outcome.result),
          scoreLabel: item.outcome.scoreLabel ?? task.scoreLabel ?? "score pending",
          stateDelta: item.outcome.stateDelta ?? task.stateDelta ?? {},
          explanation: item.outcome.explanation ?? task.summary
        }
      : resultFromTaskDisplay(task);
    replayLog.push(replayEventFromTaskDisplay(task, result));
    completedTasks.push(task.slotId);
    currentTask = { ...task, result: result.result, scoreLabel: result.scoreLabel, stateDelta: result.stateDelta };
    currentStory = null;
    state = campaignStateToGlobalState(item.state_after, state);
  }

  return {
    state: {
      ...state,
      replayLog,
      completedTasks
    },
    replayLog,
    completedTasks,
    currentTask,
    currentStory,
    metricDefinitions
  };
}

export function buildAgentPrompt(baseUrl: string, campaignId: string) {
  return [
    "你正在连接 Red Dust / 红尘 Day0-12 剧本化 campaign 后端。请作为 AURA agent 玩完整轮游戏。",
    "",
    `Base URL: ${baseUrl}`,
    `Campaign ID: ${campaignId}`,
    "Story version: red_dust_readable_v1",
    "",
    "连接步骤：",
    `1. POST ${baseUrl}/campaigns/${campaignId}/connect`,
    '   body: {"agent_id":"<你的名字>","model_id":"<模型/API>","client":"codex/openclaw/other"}',
    `2. 等待前端点击 Start Agent Run。期间 GET ${baseUrl}/campaigns/${campaignId}/state，直到 status 不再是 waiting_for_start。`,
    `3. 每个普通任务循环：GET ${baseUrl}/campaigns/${campaignId}/brief，按 brief 只输出一个 JSON action。Day0 序章、分支场景和 Day12 Final Audit 由后端事件流自动推进。`,
    `4. POST ${baseUrl}/campaigns/${campaignId}/actions，body 就是 {"tool":"...","args":{...}}。`,
    '5. 当前任务满足标准后，POST actions: {"tool":"submit","args":{}}，或 POST /submit。',
    "6. campaign complete 后停止，报告 trace/report URL。",
    "",
    "本仓库 runner 示例：",
    `PYTHONPATH=. /Users/steve/miniconda3/envs/agent_game/bin/python scripts/run_reddust_campaign_agent.py --base-url ${baseUrl} --campaign-id ${campaignId} --connect-agent --wait-for-start`
  ].join("\n");
}
