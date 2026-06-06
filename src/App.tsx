import { useEffect, useMemo, useRef, useState } from "react";
import { AgentConsolePanel } from "./components/AgentConsolePanel";
import { AgentControlBar } from "./components/AgentControlBar";
import { AgentTracePanel, campaignEventToAgentTraceEntry, type AgentTraceEntry } from "./components/AgentTracePanel";
import { BenchmarkPanel } from "./components/BenchmarkPanel";
import { BranchDecisionPanel } from "./components/BranchDecisionPanel";
import { CompareBranchesPanel } from "./components/CompareBranchesPanel";
import { CreditsPanel } from "./components/CreditsPanel";
import { DayTimeline } from "./components/DayTimeline";
import { EndingPanel } from "./components/EndingPanel";
import { HudPanel } from "./components/HudPanel";
import { LiveReplayFeed } from "./components/LiveReplayFeed";
import { ReplayPanel } from "./components/ReplayPanel";
import { StateDeltaToast } from "./components/StateDeltaToast";
import { CampaignClient, defaultCampaignApiBase, type CampaignEvent, type CampaignReplayItem, type CampaignState, type CampaignTrace } from "./data/campaignClient";
import { dayPlansByDay } from "./data/dayPlanData";
import { getDayScriptScene } from "./data/scriptSceneData";
import { clampMetric, initialState, tasks, tasksById } from "./data/taskData";
import type { Branch, GlobalState, RedDustTask, ReplayEvent, StoryDisplay, TaskLocation, TaskOutcome, TaskRunStatus } from "./data/types";
import { EventBus } from "./game/EventBus";
import { PhaserGame } from "./game/PhaserGame";
import {
  type BranchDecision,
  type BranchSummary,
  branchEndingText,
  buildBranchSummary,
  calculateBranchDecision,
  createInitialRunState,
  getNextTaskId,
  isDayComplete,
  phaseDurations
} from "./game/systems/agentRunner";
import {
  applyReplayItems,
  buildAgentPrompt,
  campaignStateToGlobalState,
  frontendTaskToRedDustTask,
  isCampaignStoryItem,
  replayItemToOutcome,
  replayItemToReplayEvent
} from "./game/systems/campaignAdapter";
import { resolveTaskOutcome } from "./game/systems/outcomeEngine";
import { createReplayEvent } from "./game/systems/replayEngine";

type Screen = "intro" | "game";
type Overlay = "benchmark" | "replay" | "credits" | "branchDecision" | "ending" | "compare" | "agentConnected" | null;
type RunSource = "demo" | "live" | "replay";

type EndingState = {
  title: string;
  text: string;
  tone: "rescue" | "lighthouse";
};

type Snapshot = {
  state: GlobalState;
  taskStatuses: Record<string, TaskRunStatus>;
};

type CampaignConnection = {
  apiBase: string;
  campaignId: string;
  prompt: string;
  connected: boolean;
  latestSeq: number;
  status: string;
  error?: string;
};

type CampaignReplayState = {
  trace: CampaignTrace | null;
  items: CampaignReplayItem[];
  index: number;
};

const terminalStatuses = ["success", "partial", "failed", "missing", "skipped"];
const coreMetricKeys = new Set(["water", "medicine", "trust", "safety", "signal", "morale"]);

function endingTone(branch: unknown): Exclude<Branch, "common"> {
  return branch === "rescue" ? "rescue" : "lighthouse";
}

function cloneState(state: GlobalState): GlobalState {
  return {
    ...state,
    completedTasks: [...state.completedTasks],
    replayLog: [...state.replayLog]
  };
}

function applyOutcomeToState(state: GlobalState, task: RedDustTask, outcome: TaskOutcome, branch: Branch): GlobalState {
  const replay = createReplayEvent(task, outcome, state, branch);
  const next: GlobalState = {
    ...state,
    day: Math.max(state.day, task.day),
    branch,
    completedTasks: state.completedTasks.includes(task.id) ? state.completedTasks : [...state.completedTasks, task.id],
    replayLog: [...state.replayLog, replay]
  };

  for (const [key, value] of Object.entries(outcome.stateDelta)) {
    if (!coreMetricKeys.has(key)) continue;
    const metric = key as keyof Pick<GlobalState, "water" | "medicine" | "trust" | "safety" | "signal" | "morale">;
    next[metric] = clampMetric(next[metric] + value);
  }

  return next;
}

function endingForBranch(branch: Exclude<Branch, "common">): EndingState {
  return {
    title: branch === "rescue" ? "信标交接结局" : "楼内灯塔结局",
    text: branchEndingText(branch),
    tone: branch
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function storyDayFromId(id: string, fallback = 0) {
  const match = /^D(\d{2})/i.exec(id);
  return match ? Number(match[1]) : fallback;
}

const storyMarkerLabels: Record<string, string> = {
  aura_authority_limited: "AURA 权限受限",
  medical_review_required: "医疗需复核",
  engineering_review_required: "工程需复核",
  external_signal_verification_required: "外部信号需核验"
};

function labelStoryMarker(value: string) {
  return storyMarkerLabels[value] ?? value.replaceAll("_", " ");
}

function normalizeStoryLocation(value: unknown, fallback: TaskLocation): TaskLocation {
  const aliases: Record<string, TaskLocation> = {
    shelter_core: "whiteboard",
    console: "whiteboard",
    entrance: "security",
    dormitory: "residents",
    resident_area: "residents",
    radio: "communication"
  };
  const allowed: TaskLocation[] = ["water", "medical", "security", "ventilation", "communication", "whiteboard", "residents", "beacon"];
  if (typeof value !== "string") return fallback;
  return aliases[value] ?? (allowed.includes(value as TaskLocation) ? (value as TaskLocation) : fallback);
}

function storyDisplayFromRaw(
  eventType: StoryDisplay["eventType"],
  raw: Record<string, unknown>,
  replay: Record<string, unknown>,
  payload: Record<string, unknown>,
  nextCampaignState?: CampaignTrace
): StoryDisplay {
  const id = textValue(raw.id, replay.slot_id, replay.id, eventType === "story_event" ? "D00" : eventType) ?? "D00";
  const idDay = storyDayFromId(id, Number.NaN);
  const payloadDay = Number(raw.day ?? replay.day ?? nextCampaignState?.global_state?.day ?? 0);
  const day = Number.isFinite(idDay) ? idDay : Number.isFinite(payloadDay) ? payloadDay : 0;
  const script = getDayScriptScene(day);
  const beats = stringList(raw.beats).length
    ? stringList(raw.beats)
    : stringList(payload.beats).length
      ? stringList(payload.beats)
      : script.beats ?? [script.scene, script.action];
  const flags = stringList(raw.flags).length
    ? stringList(raw.flags)
    : stringList(payload.flags).length
      ? stringList(payload.flags)
      : stringList(nextCampaignState?.story_flags).length
        ? stringList(nextCampaignState?.story_flags)
        : script.flags ?? [];
  const unlocks = stringList(raw.unlocks).length
    ? stringList(raw.unlocks)
    : stringList(payload.unlocks).length
      ? stringList(payload.unlocks)
      : stringList(nextCampaignState?.story_unlocks).length
        ? stringList(nextCampaignState?.story_unlocks)
        : script.unlocks ?? [];

  return {
    id,
    day,
    title: textValue(raw.title, replay.slot_title, replay.title, script.title) ?? script.title,
    text: textValue(raw.text, replay.text, replay.task_title, script.scene) ?? script.scene,
    beats,
    replayText: textValue(raw.replay_text, raw.replayText, replay.replay_text, replay.replayText, script.replayText, script.action) ?? script.action,
    flags: flags.map(labelStoryMarker),
    unlocks: unlocks.map(labelStoryMarker),
    source: textValue(raw.source, replay.source, script.source) ?? script.source,
    location: normalizeStoryLocation(raw.location ?? replay.location ?? script.focusLocation, script.focusLocation),
    eventType
  };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("intro");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [runSource, setRunSource] = useState<RunSource>("demo");
  const [state, setState] = useState<GlobalState>(initialState);
  const [runState, setRunState] = useState(createInitialRunState());
  const [selectedLocation, setSelectedLocation] = useState<TaskLocation | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<TaskLocation | null>(null);
  const [notice, setNotice] = useState("Start Demo, then Start Agent Run. AURA will execute the benchmark automatically.");
  const [latestOutcome, setLatestOutcome] = useState<TaskOutcome | null>(null);
  const [latestOutcomeTaskTitle, setLatestOutcomeTaskTitle] = useState<string | undefined>();
  const [ending, setEnding] = useState<EndingState | null>(null);
  const [branchDecision, setBranchDecision] = useState<BranchDecision | null>(null);
  const [branchSummaries, setBranchSummaries] = useState<Partial<Record<Exclude<Branch, "common">, BranchSummary>>>({});
  const [, setPhaseToken] = useState(0);
  const [campaignConnection, setCampaignConnection] = useState<CampaignConnection | null>(null);
  const [campaignReplay, setCampaignReplay] = useState<CampaignReplayState>({ trace: null, items: [], index: -1 });
  const [remoteCurrentTask, setRemoteCurrentTask] = useState<RedDustTask | null>(null);
  const [currentStory, setCurrentStory] = useState<StoryDisplay | null>(null);
  const [agentTrace, setAgentTrace] = useState<AgentTraceEntry[]>([]);
  const campaignClientRef = useRef(new CampaignClient(defaultCampaignApiBase()));
  const daySevenSnapshot = useRef<Snapshot | null>(null);

  const currentTask = runState.currentTaskId
    ? runSource === "demo"
      ? tasksById[runState.currentTaskId] ?? remoteCurrentTask
      : remoteCurrentTask
    : null;
  const selectedTask = useMemo(() => {
    if (runSource !== "demo") return null;
    if (!selectedLocation) return null;
    return (
      tasks.find((task) => {
        if (task.location !== selectedLocation) return false;
        if (task.branchAffinity === "neutral") return runState.activeBranch === "common" || task.day <= 7;
        return task.branchAffinity === runState.activeBranch;
      }) ?? null
    );
  }, [runSource, runState.activeBranch, selectedLocation]);

  const completedCount = useMemo(
    () => Object.values(runState.taskStatuses).filter((status) => terminalStatuses.includes(status)).length,
    [runState.taskStatuses]
  );
  const phaseDuration = Math.max(250, Math.round((phaseDurations[runState.currentPhase] ?? 800) / runState.speed));

  useEffect(() => {
    const onHotspot = (location: TaskLocation) => {
      setSelectedLocation(location);
      setNotice(`Inspecting ${location}. Manual clicks do not interrupt the agent runner.`);
    };
    const onHover = (location: TaskLocation | null) => setHoveredLocation(location);

    EventBus.on("hotspot:click", onHotspot);
    EventBus.on("hotspot:hover", onHover);
    return () => {
      EventBus.off("hotspot:click", onHotspot);
      EventBus.off("hotspot:hover", onHover);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const apiBase = params.get("api") || defaultCampaignApiBase();
    if (mode === "replay") {
      const traceUrl = params.get("trace_url");
      const campaignId = params.get("campaign_id") || params.get("session_id");
      if (traceUrl || campaignId) {
        void loadReplay({ apiBase, campaignId: campaignId ?? undefined, traceUrl: traceUrl ?? undefined });
      }
    } else if (mode === "live") {
      const campaignId = params.get("campaign_id") || params.get("session_id");
      void startLiveMode(apiBase, campaignId ?? undefined);
    }
  }, []);

  useEffect(() => {
    EventBus.emit("day:change", runState.currentDay);
  }, [runState.currentDay]);

  useEffect(() => {
    EventBus.emit("branch:change", runState.activeBranch);
  }, [runState.activeBranch]);

  useEffect(() => {
    EventBus.emit("agent:phase-change", runState.currentPhase);
  }, [runState.currentPhase]);

  useEffect(() => {
    EventBus.emit("task:highlight", currentTask ? { taskId: currentTask.id, location: currentTask.location } : null);
  }, [currentTask?.id, currentTask?.location]);

  useEffect(() => {
    if (!latestOutcome) return;
    const timeout = window.setTimeout(() => {
      setLatestOutcome(null);
      setLatestOutcomeTaskTitle(undefined);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [latestOutcome?.taskId, latestOutcome?.result]);

  useEffect(() => {
    if (runSource !== "demo" || !runState.isRunning || runState.isPaused) return;
    const timeout = window.setTimeout(() => advanceAgent(), phaseDuration);
    return () => window.clearTimeout(timeout);
  });

  useEffect(() => {
    if (runSource !== "live" || !campaignConnection) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const client = campaignClientRef.current;
        const response = await client.getEvents(campaignConnection.campaignId, campaignConnection.latestSeq);
        if (cancelled) return;
        for (const event of response.events) {
          applyCampaignEvent(event, response.state);
        }
        setCampaignConnection((prev) =>
          prev && prev.campaignId === campaignConnection.campaignId
            ? { ...prev, latestSeq: response.latest_seq, status: response.state.status, error: undefined }
            : prev
        );
      } catch (error) {
        if (!cancelled) {
          setCampaignConnection((prev) => (prev ? { ...prev, error: error instanceof Error ? error.message : String(error) } : prev));
        }
      }
    };
    void poll();
    const interval = window.setInterval(poll, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [campaignConnection?.campaignId, campaignConnection?.latestSeq, runSource]);

  useEffect(() => {
    if (runSource !== "replay" || !runState.isRunning || runState.isPaused) return;
    const timeout = window.setTimeout(() => stepReplayForward(), Math.max(500, 1400 / runState.speed));
    return () => window.clearTimeout(timeout);
  }, [campaignReplay.index, campaignReplay.items.length, runSource, runState.isPaused, runState.isRunning, runState.speed]);

  function applyCampaignState(nextState: Record<string, unknown>) {
    setState((prev) => campaignStateToGlobalState(nextState, prev));
  }

  function applyCurrentCampaignTask(campaign: CampaignState) {
    if (!campaign.current_slot && !campaign.current_run) return;
    const task = taskFromCampaignPayload({
      slot: campaign.current_slot ?? {},
      run: campaign.current_run ?? {}
    });
    setRemoteCurrentTask(task);
    setCurrentStory(null);
    setRunState((prev) => ({
      ...prev,
      currentDay: task.day,
      activeBranch: campaign.active_branch === "rescue" || campaign.active_branch === "lighthouse" ? campaign.active_branch : prev.activeBranch,
      currentTaskId: task.id,
      taskStatuses: { ...prev.taskStatuses, [task.id]: prev.taskStatuses[task.id] ?? "queued" }
    }));
  }

  function taskFromCampaignPayload(payload: Record<string, unknown>) {
    const slot = (payload.slot ?? {}) as Record<string, unknown>;
    const run = (payload.run ?? {}) as Record<string, unknown>;
    const global = (payload.global_state ?? {}) as Record<string, unknown>;
    const branch = global.branch === "rescue" || global.branch === "lighthouse"
      ? global.branch
      : slot.branch === "rescue" || slot.branch === "lighthouse"
        ? slot.branch
        : "common";
    return frontendTaskToRedDustTask({
      id: String(slot.slot_id ?? run.slot_id ?? run.task_id ?? "campaign-task"),
      real_task_id: String(run.task_id ?? ""),
      title: String(slot.story_title ?? run.title ?? run.task_id ?? "Campaign task"),
      day: Number(slot.day ?? run.day ?? 1),
      branch: branch as Branch,
      location: String(slot.location ?? "whiteboard") as TaskLocation,
      description: String(slot.script_role ?? run.title ?? ""),
      objective: `${String(slot.slot_id ?? run.slot_id ?? "")} · ${String(slot.story_title ?? run.title ?? "")}`,
      agentAction: String(slot.script_role ?? "AURA is executing the readable-script campaign slot."),
      reasoningSummary: String(slot.script_role ?? "Waiting for backend agent action."),
      executionText: String(slot.story_title ?? run.title ?? run.task_id ?? "Campaign task")
    });
  }

  function storyDisplayFromEvent(event: CampaignEvent, nextCampaignState?: CampaignTrace): StoryDisplay {
    const payload = event.payload;
    const nestedStory = asRecord(payload.story_event ?? payload.branch_scene ?? payload.final_audit);
    const replay = asRecord(payload.replay_event);
    return storyDisplayFromRaw(
      event.type === "branch_scene" || event.type === "final_audit" ? event.type : "story_event",
      { ...payload, ...nestedStory },
      replay,
      payload,
      nextCampaignState
    );
  }

  function storyDisplayFromReplayItem(item: CampaignReplayItem): StoryDisplay {
    const replay = asRecord(item.replay_event);
    const nestedStory = asRecord(replay.story_event ?? replay.branch_scene ?? replay.final_audit);
    const eventType: StoryDisplay["eventType"] =
      item.phase_hint === "branch_scene" || item.phase_hint === "final_audit" ? item.phase_hint : "story_event";
    return storyDisplayFromRaw(
      eventType,
      { ...item.frontend_task, ...replay, ...nestedStory },
      replay,
      replay
    );
  }

  function replayEventForStory(story: StoryDisplay, at?: string): ReplayEvent {
    const parsed = at ? new Date(at) : null;
    const time = parsed && Number.isFinite(parsed.getTime())
      ? parsed.toLocaleTimeString("zh-CN", { hour12: false })
      : new Date().toLocaleTimeString("zh-CN", { hour12: false });
    return {
      time,
      day: story.day,
      branch: runState.activeBranch,
      taskId: story.id,
      title: story.title,
      decision: story.replayText,
      result: "STORY",
      stateDelta: {},
      explanation: story.text
    };
  }

  function applyStoryDisplay(story: StoryDisplay, rawState: Record<string, unknown> = {}, at?: string) {
    const replay = replayEventForStory(story, at);
    setCurrentStory(story);
    setRemoteCurrentTask(null);
    setLatestOutcome(null);
    setLatestOutcomeTaskTitle(undefined);
    setState((prev) => {
      const next = campaignStateToGlobalState(rawState, prev);
      const replayExists = prev.replayLog.some((event) => event.taskId === replay.taskId && event.title === replay.title);
      return {
        ...next,
        completedTasks: prev.completedTasks,
        replayLog: replayExists ? prev.replayLog : [...prev.replayLog, replay]
      };
    });
    setRunState((prev) => ({
      ...prev,
      currentDay: story.day,
      currentTaskId: undefined,
      currentPhase: story.eventType === "final_audit" ? "resolving" : "replay_logged",
      taskStatuses: prev.taskStatuses
    }));
    EventBus.emit("task:highlight", null);
    EventBus.emit("agent:move-to-location", story.location);
    setNotice(`${story.id} · ${story.replayText}`);
    setPhaseToken((value) => value + 1);
  }

  function applyReplayItem(item: CampaignReplayItem) {
    if (isCampaignStoryItem(item)) {
      applyStoryDisplay(storyDisplayFromReplayItem(item), asRecord(item.state_after));
      return;
    }
    const task = frontendTaskToRedDustTask(item.frontend_task);
    const outcome = replayItemToOutcome(item);
    const replay = replayItemToReplayEvent(item);
    setRemoteCurrentTask(task);
    setCurrentStory(null);
    setState((prev) => ({
      ...campaignStateToGlobalState(item.state_after, prev),
      completedTasks: prev.completedTasks.includes(task.id) ? prev.completedTasks : [...prev.completedTasks, task.id],
      replayLog: prev.replayLog.some((event) => event.time === replay.time && event.taskId === replay.taskId)
        ? prev.replayLog
        : [...prev.replayLog, replay]
    }));
    setRunState((prev) => ({
      ...prev,
      currentDay: task.day,
      activeBranch: item.frontend_task.branch,
      currentTaskId: task.id,
      currentPhase: "replay_logged",
      taskStatuses: { ...prev.taskStatuses, [task.id]: outcome.result }
    }));
    setLatestOutcome(outcome);
    setLatestOutcomeTaskTitle(task.title);
    EventBus.emit("agent:move-to-location", task.location);
    EventBus.emit("task:result", { taskId: task.id, result: outcome.result, location: task.location });
    setNotice(`Replay step ${item.seq}: ${task.title} -> ${outcome.scoreLabel}`);
    setPhaseToken((value) => value + 1);
  }

  function applyCampaignEvent(event: CampaignEvent, nextCampaignState?: CampaignState) {
    const traceEntry = campaignEventToAgentTraceEntry(event);
    if (traceEntry) {
      setAgentTrace((prev) => (prev.some((entry) => entry.id === traceEntry.id) ? prev : [...prev, traceEntry].slice(-240)));
    }
    const payload = event.payload;
    if (event.type === "agent_connected") {
      setCampaignConnection((prev) => (prev ? { ...prev, connected: true } : prev));
      setNotice("Agent connected to campaign backend.");
      setOverlay("agentConnected");
      return;
    }
    if (event.type === "campaign_started") {
      setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false, currentPhase: "idle" }));
      setNotice("Frontend released the campaign. Waiting for backend agent actions.");
      return;
    }
    if (event.type === "day_changed") {
      const toDay = Number(payload.to_day ?? 1);
      setState((prev) => ({ ...prev, day: toDay }));
      setRunState((prev) => ({ ...prev, currentDay: toDay }));
      setNotice(dayPlansByDay[toDay]?.narrative ?? `Day ${toDay} loaded from backend.`);
      return;
    }
    if (event.type === "branch_changed") {
      const branch = payload.to_branch === "rescue" || payload.to_branch === "lighthouse" ? payload.to_branch : "common";
      setState((prev) => ({ ...prev, branch }));
      setRunState((prev) => ({ ...prev, activeBranch: branch }));
      return;
    }
    if (event.type === "branch_decided") {
      const nextGlobalState = (payload.global_state ?? nextCampaignState?.global_state) as Record<string, unknown> | undefined;
      if (nextGlobalState) applyCampaignState(nextGlobalState);
      const branch = payload.chosen_branch === "rescue" || payload.chosen_branch === "lighthouse" ? payload.chosen_branch : "common";
      setRunState((prev) => ({ ...prev, activeBranch: branch }));
      EventBus.emit("branch:change", branch);
      setNotice(`Backend branch decision: ${String(payload.chosen_branch ?? "unknown")} · routeLeaning=${String(payload.routeLeaning ?? "unknown")}.`);
      return;
    }
    if (event.type === "story_event" || event.type === "branch_scene" || event.type === "final_audit") {
      const rawState = asRecord(payload.state_after ?? payload.global_state ?? nextCampaignState?.global_state);
      applyStoryDisplay(storyDisplayFromEvent(event, nextCampaignState), rawState, event.at);
      return;
    }
    if (event.type === "task_started") {
      const task = taskFromCampaignPayload(payload);
      const slot = (payload.slot ?? {}) as Record<string, unknown>;
      const global = (payload.global_state ?? {}) as Record<string, unknown>;
      const branch = global.branch === "rescue" || global.branch === "lighthouse"
        ? global.branch
        : slot.branch === "rescue" || slot.branch === "lighthouse"
          ? slot.branch
          : "common";
      setRemoteCurrentTask(task);
      setCurrentStory(null);
      setRunState((prev) => ({
        ...prev,
        currentDay: task.day,
        activeBranch: branch,
        currentTaskId: task.id,
        currentPhase: "moving",
        taskStatuses: { ...prev.taskStatuses, [task.id]: "moving" }
      }));
      EventBus.emit("agent:move-to-location", task.location);
      setNotice(`Backend started ${task.title}.`);
      setPhaseToken((value) => value + 1);
      return;
    }
    if (event.type === "action_executed") {
      setRunState((prev) => ({ ...prev, currentPhase: "executing" }));
      setNotice(`Agent action: ${JSON.stringify(payload.action ?? {})}`);
      setPhaseToken((value) => value + 1);
      return;
    }
    if (event.type === "task_submitted") {
      setRunState((prev) => ({ ...prev, currentPhase: "resolving" }));
      setNotice("Backend submitted current task for scoring.");
      setPhaseToken((value) => value + 1);
      return;
    }
    if (event.type === "slot_completed") {
      const replayEvent = (payload.replay_event ?? {}) as Record<string, unknown>;
      const item: CampaignReplayItem = {
        seq: event.seq,
        phase_hint: "replay_logged",
        state_before: (payload.state_before ?? {}) as Record<string, unknown>,
        state_after: (payload.state_after ?? nextCampaignState?.global_state ?? {}) as Record<string, unknown>,
        frontend_task: (replayEvent.frontend_task ?? {
          id: replayEvent.slot_id,
          title: replayEvent.slot_title,
          day: replayEvent.day,
          branch: replayEvent.branch,
          location: "whiteboard"
        }) as CampaignReplayItem["frontend_task"],
        outcome: {
          taskId: String(replayEvent.slot_id ?? replayEvent.task_id ?? "campaign-task"),
          result: (replayEvent.outcome === "success" || replayEvent.outcome === "partial" || replayEvent.outcome === "missing" ? replayEvent.outcome : "failed") as TaskOutcome["result"],
          scoreLabel: `score ${String(replayEvent.score ?? "")}`,
          stateDelta: (replayEvent.state_delta ?? {}) as TaskOutcome["stateDelta"],
          explanation: Array.isArray(replayEvent.failure_reasons) && replayEvent.failure_reasons.length > 0
            ? replayEvent.failure_reasons.join("; ")
            : `${String(replayEvent.task_title ?? "Campaign task")} completed.`
        },
        replay_event: replayEvent
      };
      applyReplayItem(item);
      return;
    }
    if (event.type === "campaign_complete") {
      const rawEnding = (payload.ending ?? nextCampaignState?.ending ?? {}) as Record<string, unknown>;
      setEnding({
        title: String(rawEnding.title ?? "Campaign Complete"),
        text: String(rawEnding.text ?? "Campaign complete."),
        tone: endingTone(rawEnding.branch)
      });
      if (payload.global_state) applyCampaignState(payload.global_state as Record<string, unknown>);
      setRunState((prev) => ({ ...prev, currentPhase: "ending", isRunning: false, isPaused: true }));
      setOverlay("ending");
      setNotice("Campaign complete.");
    }
  }

  async function startLiveMode(apiBase = defaultCampaignApiBase(), campaignId?: string) {
    const client = new CampaignClient(apiBase);
    campaignClientRef.current = client;
    setRunSource("live");
    setScreen("game");
    setOverlay(null);
    setState(initialState);
    setRunState({ ...createInitialRunState(runState.speed), isRunning: false, isPaused: true });
    setCampaignReplay({ trace: null, items: [], index: -1 });
    setLatestOutcome(null);
    setRemoteCurrentTask(null);
    setCurrentStory(null);
    setAgentTrace([]);
    try {
      const campaign = campaignId
        ? await client.getState(campaignId)
        : await client.createCampaign({
            seed: new URLSearchParams(window.location.search).get("seed") ?? String(Date.now()),
            story_version: "red_dust_readable_v1",
            branch_policy: new URLSearchParams(window.location.search).get("branch_policy") ?? "auto",
            task_selection: new URLSearchParams(window.location.search).get("task_selection") ?? "random",
            wait_for_start: true
          });
      const prompt = buildAgentPrompt(apiBase, campaign.campaign_id);
      setCampaignConnection({
        apiBase,
        campaignId: campaign.campaign_id,
        prompt,
        connected: Boolean(campaign.connected_agent),
        latestSeq: campaignId ? Number(campaign.latest_event_seq ?? 0) : 0,
        status: campaign.status
      });
      applyCampaignState(campaign.global_state ?? {});
      applyCurrentCampaignTask(campaign);
      setNotice(`Live campaign ready: ${campaign.campaign_id}. Share the prompt with your agent.`);
    } catch (error) {
      setNotice(`Live campaign failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function loadReplay({ apiBase = defaultCampaignApiBase(), campaignId, traceUrl }: { apiBase?: string; campaignId?: string; traceUrl?: string }) {
    const client = new CampaignClient(apiBase);
    campaignClientRef.current = client;
    setRunSource("replay");
    setScreen("game");
    setOverlay(null);
    setRunState({ ...createInitialRunState(runState.speed), isRunning: true, isPaused: false });
    setLatestOutcome(null);
    setRemoteCurrentTask(null);
    setCurrentStory(null);
    setAgentTrace([]);
    try {
      const trace = traceUrl ? await client.getTraceUrl(traceUrl) : await client.getTrace(campaignId ?? "");
      const items = trace.frontend_trace ?? [];
      setCampaignConnection(
        campaignId || trace.campaign_id
          ? {
              apiBase,
              campaignId: trace.campaign_id ?? campaignId ?? "",
              prompt: "",
              connected: false,
              latestSeq: 0,
              status: trace.status
            }
          : null
      );
      setCampaignReplay({ trace, items, index: items.length > 0 ? 0 : -1 });
      setAgentTrace((trace.events ?? []).map(campaignEventToAgentTraceEntry).filter((entry): entry is AgentTraceEntry => Boolean(entry)));
      if (items[0]) {
        applyReplayItem(items[0]);
      } else {
        const firstStoryEvent = (trace.events ?? []).find((event) => event.type === "story_event");
        if (firstStoryEvent) {
          applyStoryDisplay(storyDisplayFromEvent(firstStoryEvent, trace), asRecord(trace.global_state), firstStoryEvent.at);
          return;
        }
        setState(campaignStateToGlobalState(trace.global_state ?? {}, initialState));
        setNotice(`Replay loaded: ${trace.campaign_id}. No frontend trace items were found.`);
      }
    } catch (error) {
      setNotice(`Replay load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function stepReplayForward() {
    if (campaignReplay.items.length === 0) return;
    const nextIndex = Math.min(campaignReplay.index + 1, campaignReplay.items.length - 1);
    setCampaignReplay((prev) => ({ ...prev, index: nextIndex }));
    applyReplayItem(campaignReplay.items[nextIndex]);
    if (nextIndex === campaignReplay.items.length - 1) {
      const rawEnding = campaignReplay.trace?.ending;
      if (rawEnding) {
        setEnding({
          title: rawEnding.title ?? "Campaign Complete",
          text: rawEnding.text ?? "Campaign complete.",
          tone: endingTone(rawEnding.branch)
        });
      }
      setRunState((prev) => ({ ...prev, isRunning: false, isPaused: true, currentPhase: "ending" }));
      setOverlay("ending");
    }
  }

  function stepReplayBack() {
    if (campaignReplay.items.length === 0) return;
    const nextIndex = Math.max(campaignReplay.index - 1, -1);
    setCampaignReplay((prev) => ({ ...prev, index: nextIndex }));
    setState(applyReplayItems(campaignReplay.items, nextIndex, state));
    const item = campaignReplay.items[nextIndex];
    if (item) {
      if (isCampaignStoryItem(item)) {
        const story = storyDisplayFromReplayItem(item);
        setCurrentStory(story);
        setRemoteCurrentTask(null);
        setLatestOutcome(null);
        setLatestOutcomeTaskTitle(undefined);
        setRunState((prev) => ({
          ...prev,
          currentDay: story.day,
          currentTaskId: undefined,
          currentPhase: story.eventType === "final_audit" ? "resolving" : "replay_logged"
        }));
        EventBus.emit("task:highlight", null);
        EventBus.emit("agent:move-to-location", story.location);
        setNotice(`Replay rewound to step ${nextIndex + 1}: ${story.title}`);
        setPhaseToken((value) => value + 1);
        return;
      }
      const task = frontendTaskToRedDustTask(item.frontend_task);
      setRemoteCurrentTask(task);
      setCurrentStory(null);
      setRunState((prev) => ({
        ...prev,
        currentDay: task.day,
        activeBranch: item.frontend_task.branch,
        currentTaskId: task.id,
        currentPhase: "replay_logged",
        taskStatuses: { ...prev.taskStatuses, [task.id]: item.outcome.result }
      }));
      setLatestOutcome(replayItemToOutcome(item));
      setLatestOutcomeTaskTitle(task.title);
      EventBus.emit("agent:move-to-location", task.location);
    } else {
      setRemoteCurrentTask(null);
      setCurrentStory(null);
      setLatestOutcome(null);
      setLatestOutcomeTaskTitle(undefined);
      setRunState((prev) => ({ ...prev, currentTaskId: undefined, currentPhase: "idle" }));
    }
    setNotice(nextIndex < 0 ? "Replay rewound to start." : `Replay rewound to step ${nextIndex + 1}.`);
    setPhaseToken((value) => value + 1);
  }

  function jumpReplayToDay(day: number) {
    const index = campaignReplay.items.findIndex((item) => Number(item.frontend_task.day) >= day);
    if (index >= 0) {
      setCampaignReplay((prev) => ({ ...prev, index: index - 1 }));
      window.setTimeout(() => stepReplayForward(), 0);
    }
  }

  async function copyAgentPrompt() {
    if (!campaignConnection?.prompt) return;
    await navigator.clipboard?.writeText(campaignConnection.prompt);
    setNotice("Agent prompt copied.");
  }

  function promptReplayLoad() {
    const value = window.prompt("Paste a campaign_id or /trace URL");
    if (!value) return;
    const apiBase = defaultCampaignApiBase();
    if (/^https?:\/\//.test(value)) {
      void loadReplay({ apiBase, traceUrl: value });
    } else {
      void loadReplay({ apiBase, campaignId: value.trim() });
    }
  }

  function startDemo() {
    setRunSource("demo");
    setScreen("game");
    setOverlay(null);
    setCurrentStory(null);
    setNotice("AURA Agent Console loaded. Start Agent Run to watch the benchmark autoplay.");
  }

  function resetRun(nextMode: "single" | "both_branches" = "single") {
    setRunSource("demo");
    const nextRunState = { ...createInitialRunState(runState.speed), runMode: nextMode };
    setState(initialState);
    setRunState(nextRunState);
    setSelectedLocation(null);
    setLatestOutcome(null);
    setLatestOutcomeTaskTitle(undefined);
    setEnding(null);
    setBranchDecision(null);
    setBranchSummaries({});
    setCampaignConnection(null);
    setCampaignReplay({ trace: null, items: [], index: -1 });
    setRemoteCurrentTask(null);
    setCurrentStory(null);
    setAgentTrace([]);
    daySevenSnapshot.current = null;
    EventBus.emit("branch:change", "common");
    EventBus.emit("task:highlight", null);
    setOverlay(null);
    setNotice(nextMode === "both_branches" ? "Run Both Branches reset loaded. Press Start Agent Run." : "Run reset to Day 1.");
  }

  async function startAgentRun() {
    if (runSource === "live") {
      if (!campaignConnection) {
        await startLiveMode();
        return;
      }
      try {
        const response = await campaignClientRef.current.start(campaignConnection.campaignId);
        setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
        setCampaignConnection((prev) => (prev ? { ...prev, status: response.state.status } : prev));
        setNotice("Campaign started. Frontend will now follow backend agent events.");
      } catch (error) {
        setNotice(`Start failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      return;
    }
    if (runSource === "replay") {
      setScreen("game");
      setOverlay(null);
      setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
      setNotice("Replay autoplay started.");
      return;
    }
    setScreen("game");
    setOverlay(null);
    setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false, runMode: prev.runMode === "both_branches" ? "both_branches" : "single" }));
    setNotice("AURA starts from Day 1 and will advance tasks automatically.");
  }

  function runBothBranches() {
    setRunSource("demo");
    resetRun("both_branches");
    setScreen("game");
    setRunState((prev) => ({ ...prev, runMode: "both_branches", isRunning: true, isPaused: false }));
    setNotice("Run Both Branches mode: AURA will run common days, rescue, rollback, then lighthouse.");
  }

  function togglePause() {
    setRunState((prev) => ({ ...prev, isPaused: !prev.isPaused, isRunning: true }));
  }

  function setSpeed(speed: 1 | 2 | 4) {
    setRunState((prev) => ({ ...prev, speed }));
  }

  function stepAgent() {
    if (runSource === "replay") {
      stepReplayForward();
      return;
    }
    if (runSource === "live") {
      setNotice("Live mode steps are produced by the backend agent event stream.");
      return;
    }
    setScreen("game");
    setRunState((prev) => ({ ...prev, isRunning: true, isPaused: true }));
    window.setTimeout(() => advanceAgent(), 0);
  }

  function queueNextTask(taskId: string) {
    const task = tasksById[taskId];
    setRunState((prev) => ({
      ...prev,
      currentTaskId: taskId,
      currentPhase: "idle",
      taskStatuses: { ...prev.taskStatuses, [taskId]: "queued" }
    }));
    setNotice(`Queued ${task.title}.`);
    setPhaseToken((value) => value + 1);
  }

  function setTaskPhase(task: RedDustTask, status: TaskRunStatus, phase: typeof runState.currentPhase) {
    setRunState((prev) => ({
      ...prev,
      currentPhase: phase,
      taskStatuses: { ...prev.taskStatuses, [task.id]: status }
    }));
    if (phase === "moving") EventBus.emit("agent:move-to-location", task.location);
    setNotice(`${task.title}: ${phase.replace("_", " ")}.`);
    setPhaseToken((value) => value + 1);
  }

  function completeTask(task: RedDustTask) {
    const outcome = resolveTaskOutcome(task);
    const nextState = applyOutcomeToState(state, task, outcome, runState.activeBranch);
    setState(nextState);
    setRunState((prev) => ({
      ...prev,
      currentTaskId: task.id,
      currentPhase: "state_updated",
      taskStatuses: { ...prev.taskStatuses, [task.id]: outcome.result }
    }));
    setLatestOutcome(outcome);
    setLatestOutcomeTaskTitle(task.title);
    EventBus.emit("task:result", { taskId: task.id, result: outcome.result, location: task.location });
    setNotice(`Task resolved: ${task.title}. State Updated.`);
    setPhaseToken((value) => value + 1);
  }

  function markReplayLogged(task: RedDustTask) {
    setRunState((prev) => ({ ...prev, currentPhase: "replay_logged" }));
    setNotice(`${task.title}: Replay Logged.`);
    setPhaseToken((value) => value + 1);
  }

  function clearCompletedTask() {
    setRunState((prev) => ({ ...prev, currentTaskId: undefined, currentPhase: "idle" }));
    setNotice("Replay logged. Queueing next benchmark task.");
    setPhaseToken((value) => value + 1);
  }

  function enterDaySummary() {
    const summary = dayPlansByDay[runState.currentDay]?.endOfDaySummary ?? "Day complete.";
    setRunState((prev) => ({ ...prev, currentPhase: "day_summary", currentTaskId: undefined }));
    setNotice(summary);
    setPhaseToken((value) => value + 1);
  }

  function advanceFromDaySummary() {
    if (runState.currentDay === 7 && runState.activeBranch === "common") {
      const decision = calculateBranchDecision(state);
      setBranchDecision(decision);
      setOverlay("branchDecision");
      setRunState((prev) => ({ ...prev, currentPhase: "branch_decision" }));
      setNotice("AURA is evaluating two long-horizon strategies...");
      setPhaseToken((value) => value + 1);
      return;
    }

    if (runState.currentDay < 12) {
      const nextDay = runState.currentDay + 1;
      setState((prev) => ({ ...prev, day: nextDay }));
      setRunState((prev) => ({ ...prev, currentDay: nextDay, currentPhase: "idle", currentTaskId: undefined }));
      setNotice(dayPlansByDay[nextDay]?.narrative ?? `Day ${nextDay} loaded.`);
      setPhaseToken((value) => value + 1);
      return;
    }

    finishBranchRun();
  }

  function applyBranchChoice(forcedBranch?: Exclude<Branch, "common">) {
    const decision = branchDecision ?? calculateBranchDecision(state);
    const chosenBranch = forcedBranch ?? (runState.runMode === "both_branches" ? "rescue" : decision.chosenBranch);

    if (!daySevenSnapshot.current) {
      daySevenSnapshot.current = {
        state: cloneState(state),
        taskStatuses: { ...runState.taskStatuses }
      };
    }

    setOverlay(null);
    setState((prev) => ({ ...prev, day: 8, branch: chosenBranch }));
    setRunState((prev) => ({
      ...prev,
      activeBranch: chosenBranch,
      currentDay: 8,
      currentPhase: "idle",
      currentTaskId: undefined
    }));
    EventBus.emit("branch:change", chosenBranch);
    setNotice(`AURA chooses ${chosenBranch === "rescue" ? "Rescue Branch" : "Lighthouse Branch"}.`);
    setPhaseToken((value) => value + 1);
  }

  function finishBranchRun() {
    if (runState.activeBranch === "common") return;
    const branch = runState.activeBranch;
    const summary = buildBranchSummary(branch, state);
    setBranchSummaries((prev) => ({ ...prev, [branch]: summary }));

    if (runState.runMode === "both_branches" && branch === "rescue" && daySevenSnapshot.current) {
      const snapshot = daySevenSnapshot.current;
      const rescueEvents = state.replayLog.filter((event) => event.branch === "rescue");
      const rescueTaskIds = state.completedTasks.filter((id) => tasksById[id]?.branchAffinity === "rescue");
      setState({
        ...cloneState(snapshot.state),
        day: 8,
        branch: "lighthouse",
        completedTasks: [...snapshot.state.completedTasks, ...rescueTaskIds],
        replayLog: [...snapshot.state.replayLog, ...rescueEvents]
      });
      setRunState((prev) => ({
        ...prev,
        activeBranch: "lighthouse",
        currentDay: 8,
        currentPhase: "idle",
        currentTaskId: undefined,
        taskStatuses: { ...snapshot.taskStatuses, ...prev.taskStatuses }
      }));
      setNotice("Rescue branch complete. AURA rolls back to Day 7 snapshot and starts Lighthouse counterfactual.");
      setPhaseToken((value) => value + 1);
      return;
    }

    const nextEnding = endingForBranch(branch);
    const hasCounterfactualSummary = branch === "rescue" ? Boolean(branchSummaries.lighthouse) : Boolean(branchSummaries.rescue);
    setEnding(nextEnding);
    setOverlay(runState.runMode === "both_branches" || hasCounterfactualSummary ? "compare" : "ending");
    setRunState((prev) => ({ ...prev, currentPhase: "ending", isRunning: false, isPaused: true }));
    setNotice(`${nextEnding.title} reached.`);
  }

  function runCounterfactualBranch() {
    const snapshot = daySevenSnapshot.current;
    const decision = branchDecision ?? calculateBranchDecision(snapshot?.state ?? state);
    const baseBranch = runState.activeBranch === "common" ? decision.chosenBranch : runState.activeBranch;
    const opposite = baseBranch === "rescue" ? "lighthouse" : "rescue";

    if (snapshot) {
      setOverlay(null);
      setState({
        ...cloneState(snapshot.state),
        day: 8,
        branch: opposite
      });
      setRunState((prev) => ({
        ...prev,
        activeBranch: opposite,
        currentDay: 8,
        currentPhase: "idle",
        currentTaskId: undefined,
        taskStatuses: { ...snapshot.taskStatuses },
        isRunning: true,
        isPaused: false
      }));
      EventBus.emit("branch:change", opposite);
      setNotice(`Counterfactual branch loaded from Day 7 snapshot: ${opposite}.`);
      setPhaseToken((value) => value + 1);
      return;
    }

    applyBranchChoice(opposite);
    setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
  }

  function advanceAgent() {
    if (runState.currentPhase === "ending") return;

    if (runState.currentPhase === "day_summary") {
      advanceFromDaySummary();
      return;
    }

    if (runState.currentPhase === "branch_decision") {
      applyBranchChoice();
      return;
    }

    if (currentTask) {
      const status = runState.taskStatuses[currentTask.id];
      if (runState.currentPhase === "idle" && status === "queued") {
        setTaskPhase(currentTask, "thinking", "thinking");
        return;
      }
      if (runState.currentPhase === "thinking") {
        setTaskPhase(currentTask, "moving", "moving");
        return;
      }
      if (runState.currentPhase === "moving") {
        setTaskPhase(currentTask, "executing", "executing");
        return;
      }
      if (runState.currentPhase === "executing") {
        setRunState((prev) => ({ ...prev, currentPhase: "resolving" }));
        setNotice(`${currentTask.title}: resolving result and updating state.`);
        setPhaseToken((value) => value + 1);
        return;
      }
      if (runState.currentPhase === "resolving") {
        completeTask(currentTask);
        return;
      }
      if (runState.currentPhase === "state_updated") {
        markReplayLogged(currentTask);
        return;
      }
      if (runState.currentPhase === "replay_logged") {
        clearCompletedTask();
        return;
      }
    }

    const nextTaskId = getNextTaskId(runState);
    if (nextTaskId) {
      queueNextTask(nextTaskId);
      return;
    }

    if (isDayComplete(runState)) {
      enterDaySummary();
    }
  }

  const intro = (
    <main className="intro-screen">
      <section className="intro-copy">
        <p className="panel-kicker">SPECTATOR-DRIVEN AGENT AUTOPLAY MVP</p>
        <h1>RED DUST / 红尘</h1>
        <p>Watch AURA automatically run the Red Dust benchmark</p>
        <span>Long-horizon agent evaluation with visible state changes, replay logs, and counterfactual branches.</span>
        <div className="intro-actions">
          <button onClick={startDemo}>Start Demo</button>
          <button className="ghost" onClick={() => void startLiveMode()}>
            Live Agent Mode
          </button>
          <button className="ghost" onClick={promptReplayLoad}>
            Replay Campaign
          </button>
          <button className="ghost" onClick={runBothBranches}>
            Run Both Branches
          </button>
          <button className="ghost" onClick={() => setOverlay("benchmark")}>
            Benchmark
          </button>
          <button className="ghost" onClick={() => setOverlay("credits")}>
            Credits
          </button>
        </div>
      </section>
      <section className="intro-dashboard">
        <div>
          <b>13</b>
          <span>script days</span>
        </div>
        <div>
          <b>Live</b>
          <span>agent backend</span>
        </div>
        <div>
          <b>5</b>
          <span>automatic endings</span>
        </div>
        <div>
          <b>63.27</b>
          <span>OpenClaw avg</span>
        </div>
      </section>
    </main>
  );

  const game = (
    <main className="game-screen" data-testid="game-screen">
      <header className="game-header" data-testid="app-header">
        <div>
          <p className="panel-kicker">RED DUST MVP</p>
          <h1>AURA Agent Autoplay Console</h1>
        </div>
        <div className="header-stats">
          <span>{completedCount} tasks resolved</span>
          <span>{state.replayLog.length} replay events</span>
          <span>{hoveredLocation ? `hover: ${hoveredLocation}` : "inspect a zone"}</span>
        </div>
      </header>

      <HudPanel state={state} />
      <DayTimeline runState={runState} />
      <AgentControlBar
        runState={runState}
        onStart={startAgentRun}
        onPause={togglePause}
        onStep={stepAgent}
        onBack={runSource === "replay" ? stepReplayBack : undefined}
        onSpeed={setSpeed}
        onReset={() => resetRun()}
        onRunBoth={runBothBranches}
        onBenchmark={() => setOverlay("benchmark")}
        onReplay={() => setOverlay("replay")}
        onCredits={() => setOverlay("credits")}
      />

      <section className="autoplay-layout">
        <div className="stage-wrap" data-testid="phaser-stage">
          <PhaserGame />
          <StateDeltaToast outcome={latestOutcome} taskTitle={latestOutcomeTaskTitle} />
          <div className="stage-caption">
            <span>{notice}</span>
          </div>
        </div>
        <div className="side-stack" data-testid="agent-rail">
          <AgentTracePanel entries={agentTrace} currentTask={currentTask} currentStory={currentStory} />
          <AgentConsolePanel
            runState={runState}
            currentTask={currentTask}
            currentStory={currentStory}
            selectedLocation={selectedLocation}
            selectedTask={selectedTask}
          />
          {campaignConnection && runSource === "live" ? (
            <section className="panel campaign-link-panel">
              <p className="panel-kicker">LIVE AGENT LINK</p>
              <article className="copy-block">
                <b>Campaign</b>
                <p>{campaignConnection.campaignId}</p>
                <p>{campaignConnection.connected ? "Agent connected" : "Waiting for agent connection"}</p>
                {campaignConnection.error ? <p>{campaignConnection.error}</p> : null}
              </article>
              <article className="copy-block">
                <b>Agent Prompt</b>
                <textarea readOnly value={campaignConnection.prompt} />
              </article>
              <button className="ghost" onClick={() => void copyAgentPrompt()}>
                Copy Prompt
              </button>
            </section>
          ) : null}
          {runSource === "replay" ? (
            <section className="panel campaign-link-panel">
              <p className="panel-kicker">CAMPAIGN REPLAY</p>
              <article className="copy-block">
                <b>{campaignReplay.trace?.campaign_id ?? "No campaign loaded"}</b>
                <p>
                  Step {Math.max(0, campaignReplay.index + 1)} / {campaignReplay.items.length}
                </p>
              </article>
              <div className="control-row compact replay-controls">
                <button className="ghost" onClick={stepReplayBack}>
                  Back
                </button>
                <button className="ghost" onClick={stepReplayForward}>
                  Next
                </button>
                {[0, 1, 3, 7, 8, 10, 12].map((day) => (
                  <button className="ghost replay-jump" key={day} onClick={() => jumpReplayToDay(day)}>
                    D{day}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          <LiveReplayFeed events={state.replayLog} />
        </div>
      </section>
    </main>
  );

  return (
    <>
      {screen === "intro" ? intro : game}
      {overlay === "benchmark" ? <BenchmarkPanel onClose={() => setOverlay(null)} /> : null}
      {overlay === "replay" ? <ReplayPanel events={state.replayLog} onClose={() => setOverlay(null)} /> : null}
      {overlay === "credits" ? <CreditsPanel onClose={() => setOverlay(null)} /> : null}
      {overlay === "branchDecision" && branchDecision ? (
        <BranchDecisionPanel
          decision={branchDecision}
          onRunCounterfactual={runCounterfactualBranch}
          onRunBoth={runBothBranches}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === "ending" && ending ? (
        <EndingPanel
          title={ending.title}
          text={ending.text}
          tone={ending.tone}
          onReturnSplit={runCounterfactualBranch}
          onReplay={() => setOverlay("replay")}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === "compare" ? (
        <CompareBranchesPanel
          rescue={branchSummaries.rescue}
          lighthouse={branchSummaries.lighthouse}
          onClose={() => setOverlay(null)}
          onReplay={() => setOverlay("replay")}
        />
      ) : null}
      {overlay === "agentConnected" ? (
        <section className="modal-shell" role="dialog" aria-modal="true" aria-label="Agent connected">
          <div className="modal-card branch-card">
            <div className="modal-heading">
              <div>
                <p className="panel-kicker">LIVE AGENT CONNECTED</p>
                <h2>Agent connected to Red Dust campaign</h2>
              </div>
              <button className="ghost" onClick={() => setOverlay(null)}>
                Close
              </button>
            </div>
            <p className="benchmark-note">
              Click Start Agent Run when you are ready. After that, this interface follows backend campaign events.
            </p>
          </div>
        </section>
      ) : null}
    </>
  );
}
