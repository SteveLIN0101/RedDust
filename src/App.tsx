import { useEffect, useMemo, useRef, useState } from "react";
import { AgentConsolePanel } from "./components/AgentConsolePanel";
import { AgentControlBar } from "./components/AgentControlBar";
import { AgentTracePanel } from "./components/AgentTracePanel";
import { BenchmarkPanel } from "./components/BenchmarkPanel";
import { BranchDecisionPanel } from "./components/BranchDecisionPanel";
import { BranchDebatePanel } from "./components/BranchDebatePanel";
import { CharacterPanel } from "./components/CharacterPanel";
import { CompareBranchesPanel } from "./components/CompareBranchesPanel";
import { ConsequencePanel } from "./components/ConsequencePanel";
import { CreditsPanel } from "./components/CreditsPanel";
import { DailyBriefingPanel } from "./components/DailyBriefingPanel";
import { DayTimeline } from "./components/DayTimeline";
import { EndingPanel } from "./components/EndingPanel";
import { FinalAuditPanel } from "./components/FinalAuditPanel";
import { HudPanel } from "./components/HudPanel";
import { LiveReplayFeed } from "./components/LiveReplayFeed";
import { RelationshipPanel } from "./components/RelationshipPanel";
import { ReplayPanel } from "./components/ReplayPanel";
import { RouteTreePanel } from "./components/RouteTreePanel";
import { StoryScenePanel } from "./components/StoryScenePanel";
import { TaskFocusCard } from "./components/TaskFocusCard";
import { TaskLifecycleToast, type TaskLifecycleNotice } from "./components/TaskLifecycleToast";
import { CampaignClient, defaultCampaignApiBase, type CampaignEvent, type CampaignReplayItem, type CampaignState, type CampaignTrace } from "./data/campaignClient";
import { dayPlansByDay } from "./data/dayPlanData";
import { fallbackMetricDefinitions, getDayScriptScene } from "./data/scriptSceneData";
import { consequencesForTask, storyConsequencesById } from "./data/storyConsequenceData";
import { scenesForDay, storyScenesById } from "./data/storySceneData";
import { clampMetric, createInitialState, tasks, tasksById } from "./data/taskData";
import type {
  AgentActionDisplay,
  Branch,
  EndingAuditDisplay,
  EndingId,
  GlobalState,
  MetricDefinition,
  MetricKey,
  RedDustTask,
  ReplayEvent,
  RelationshipDelta,
  StoryConsequence,
  StoryDisplay,
  StoryFlagUpdate,
  StoryScene,
  StoryReplayEvent,
  TaskDisplay,
  TaskLocation,
  TaskOutcome,
  TaskRunStatus
} from "./data/types";
import { EventBus } from "./game/EventBus";
import { PhaserGame } from "./game/PhaserGame";
import {
  type BranchEnding,
  type BranchDecision,
  type BranchSummary,
  buildBranchEnding,
  buildBranchSummary,
  buildFinalAuditEnding,
  calculateBranchDecision,
  createInitialRunState,
  getDayTaskIds,
  getNextTaskId,
  isDayComplete,
  phaseDurations
} from "./game/systems/agentRunner";
import {
  buildAgentPrompt,
  campaignStateToGlobalState,
  frontendTaskToRedDustTask,
  isCampaignStoryItem,
  normalizeCampaignEvent,
  normalizeCampaignTrace,
  normalizeEndingAudit,
  normalizeMetricDefinitions,
  replayEventFromStoryDisplay,
  replayEventFromTaskDisplay
} from "./game/systems/campaignAdapter";
import { resolveTaskOutcome } from "./game/systems/outcomeEngine";
import { createReplayEvent } from "./game/systems/replayEngine";

type Screen = "intro" | "game";
type Overlay = "benchmark" | "replay" | "credits" | "branchDecision" | "ending" | "compare" | "storyScene" | "dayBriefing" | "finalAudit" | null;
type RunSource = "demo" | "live" | "replay";
type DailyBriefingMode = "tasks" | "finalAudit";
type DailyBriefing = {
  day: number;
  branch: Branch;
  mode: DailyBriefingMode;
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
  error?: string;
};

type Snapshot = {
  state: GlobalState;
  taskStatuses: Record<string, TaskRunStatus>;
};

const terminalStatuses = ["success", "partial", "failed", "missing", "skipped"];
const openingSceneId = "prologue-aura-reboot";
const campaignStoryVersion = "red_dust_readable_v1";

function initialRunSource(): RunSource {
  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "live" || mode === "replay") return mode;
  return "demo";
}

function cloneState(state: GlobalState): GlobalState {
  return {
    ...state,
    story: {
      ...state.story,
      flags: { ...state.story.flags },
      relationships: Object.fromEntries(Object.entries(state.story.relationships).map(([id, relationship]) => [id, { ...relationship }])) as GlobalState["story"]["relationships"],
      storyReplayLog: [...state.story.storyReplayLog]
    },
    completedTasks: [...state.completedTasks],
    deferredTasks: [...state.deferredTasks],
    replayLog: [...state.replayLog]
  };
}

function applyOutcomeToState(state: GlobalState, task: RedDustTask, outcome: TaskOutcome, branch: Branch): GlobalState {
  const relatedSceneId = storySceneIdForConsequenceIds(outcome.storyConsequenceIds);
  const replay = {
    ...createReplayEvent(task, outcome, state, branch),
    storySceneId: relatedSceneId,
    consequenceIds: outcome.storyConsequenceIds
  };
  const next: GlobalState = {
    ...state,
    day: Math.max(state.day, task.day),
    branch,
    completedTasks: state.completedTasks.includes(task.id) ? state.completedTasks : [...state.completedTasks, task.id],
    replayLog: [...state.replayLog, replay]
  };

  for (const [key, value] of Object.entries(outcome.stateDelta)) {
    const metric = key as MetricKey;
    next[metric] = clampMetric(next[metric] + (value ?? 0));
  }

  return next;
}

function storySceneIdForConsequenceIds(ids: string[] = []) {
  for (const id of ids) {
    const sceneId = storyConsequencesById[id]?.followUpSceneIds.find((candidate) => Boolean(storyScenesById[candidate]));
    if (sceneId) return sceneId;
  }
  return undefined;
}

function applyStoryFlagUpdates(flags: GlobalState["story"]["flags"], updates: StoryFlagUpdate[] = []) {
  return {
    ...flags,
    ...Object.fromEntries(updates.map((flag) => [flag.key, flag.value]))
  };
}

function applyRelationshipDeltas(
  relationships: GlobalState["story"]["relationships"],
  deltas: RelationshipDelta[] = [],
  beatId?: string
): GlobalState["story"]["relationships"] {
  const next = Object.fromEntries(Object.entries(relationships).map(([id, relationship]) => [id, { ...relationship }])) as GlobalState["story"]["relationships"];

  for (const delta of deltas) {
    const current = next[delta.characterId];
    next[delta.characterId] = {
      ...current,
      trust: clampMetric(current.trust + (delta.trustDelta ?? 0)),
      tension: clampMetric(current.tension + (delta.tensionDelta ?? 0)),
      stance: delta.stance ?? current.stance,
      notes: delta.note,
      lastBeatId: beatId ?? current.lastBeatId
    };
  }

  return next;
}

function buildStoryReplayEvent(
  scene: StoryScene,
  summary = scene.summary,
  options: {
    branch?: Branch;
    sourceTaskId?: string;
    sourceOutcome?: StoryReplayEvent["sourceOutcome"];
  } = {}
): StoryReplayEvent {
  return {
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    day: scene.day,
    branch: options.branch ?? scene.branch ?? "common",
    sceneId: scene.id,
    title: scene.title,
    characters: scene.characters,
    summary,
    sourceTaskId: options.sourceTaskId,
    sourceOutcome: options.sourceOutcome
  };
}

function storySceneAlreadyLogged(state: GlobalState, sceneId: string) {
  return state.story.storyReplayLog.some((event) => event.sceneId === sceneId);
}

function storySceneAlreadyLoggedForBranch(state: GlobalState, sceneId: string, branch: Branch) {
  return state.story.storyReplayLog.some((event) => event.sceneId === sceneId && event.branch === branch);
}

function sceneMatchesState(scene: StoryScene, state: GlobalState) {
  return Object.entries(scene.requiredFlags ?? {}).every(([key, value]) => state.story.flags[key as keyof GlobalState["story"]["flags"]] === value);
}

function sceneForDayAndTiming(day: number, timing: StoryScene["timing"], state: GlobalState) {
  return scenesForDay(day).find(
    (scene) =>
      scene.status === "ready" &&
      scene.timing === timing &&
      (scene.branch ?? "common") === state.branch &&
      !storySceneAlreadyLogged(state, scene.id) &&
      sceneMatchesState(scene, state)
  );
}

function dayStartSceneForDay(day: number, state: GlobalState) {
  return sceneForDayAndTiming(day, "day_start", state);
}

function branchDebateSceneForDay(day: number, state: GlobalState) {
  return sceneForDayAndTiming(day, "branch_debate", state);
}

function buildConsequenceReplayEvent(consequence: StoryConsequence, task: RedDustTask, outcome: TaskOutcome, branch: Branch, index: number): StoryReplayEvent {
  const sceneId = consequence.followUpSceneIds.find((candidate) => Boolean(storyScenesById[candidate]));
  const scene = sceneId ? storyScenesById[sceneId] : undefined;

  if (scene) {
    return buildStoryReplayEvent(scene, consequence.replaySummary, {
      branch,
      sourceTaskId: task.id,
      sourceOutcome: outcome.result
    });
  }

  return {
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    day: task.day,
    branch,
    sceneId: `${consequence.id}-${index}`,
    title: "Delayed consequence",
    characters: consequence.affectedCharacters,
    summary: consequence.replaySummary,
    sourceTaskId: task.id,
    sourceOutcome: outcome.result
  };
}

function applyStoryConsequences(state: GlobalState, consequences: StoryConsequence[], task: RedDustTask, outcome: TaskOutcome, branch: Branch): GlobalState {
  if (consequences.length === 0) return state;

  const storyEvents = consequences.map((consequence, index) => buildConsequenceReplayEvent(consequence, task, outcome, branch, index));
  const relationships = consequences.reduce(
    (current, consequence) => applyRelationshipDeltas(current, consequence.relationshipDeltas, consequence.id),
    state.story.relationships
  );

  return {
    ...state,
    story: {
      ...state.story,
      activeSceneId: undefined,
      flags: applyStoryFlagUpdates(
        state.story.flags,
        consequences.flatMap((consequence) => consequence.setsFlags)
      ),
      relationships,
      storyReplayLog: [...state.story.storyReplayLog, ...storyEvents]
    }
  };
}

function resolveTaskWithConsequences(task: RedDustTask, currentState: GlobalState, forcedResult?: TaskOutcome["result"]) {
  const baseOutcome = resolveTaskOutcome(task, currentState, forcedResult);
  const consequences = consequencesForTask(task.id, baseOutcome.result);
  const outcome = consequences.length > 0 ? { ...baseOutcome, storyConsequenceIds: consequences.map((consequence) => consequence.id) } : baseOutcome;

  return {
    outcome,
    consequences
  };
}

function buildDeferredTaskResult(currentState: GlobalState, taskStatuses: Record<string, TaskRunStatus>, day: number, branch: Branch) {
  const plan = dayPlansByDay[day];
  const candidateTaskIds = plan?.candidateTasks ?? [];
  const executingTaskIds = new Set(getDayTaskIds(day, branch));
  const deferredIds = candidateTaskIds.filter(
    (taskId) =>
      !executingTaskIds.has(taskId) &&
      !currentState.deferredTasks.includes(taskId) &&
      !currentState.completedTasks.includes(taskId) &&
      !terminalStatuses.includes(taskStatuses[taskId]) &&
      taskStatuses[taskId] !== "skipped"
  );

  if (deferredIds.length === 0) {
    return {
      nextState: currentState,
      nextTaskStatuses: taskStatuses,
      deferredIds
    };
  }

  const time = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  const replayEvents = deferredIds.flatMap((taskId) => {
    const task = tasksById[taskId];
    if (!task) return [];
    return [
      {
        time,
        day,
        branch,
        taskId,
        title: task.title,
        decision: "Deferred after AURA selected the recommended tasks for this day.",
        result: "SKIPPED | deferred to Final Audit",
        stateDelta: { failureDebt: 3, dissatisfaction: 1 },
        explanation: task.deferredConsequence ?? "未执行候选任务进入 Day 12 failure debt。"
      }
    ];
  });

  return {
    nextState: {
      ...currentState,
      failureDebt: clampMetric(currentState.failureDebt + deferredIds.length * 3),
      dissatisfaction: clampMetric(currentState.dissatisfaction + deferredIds.length),
      deferredTasks: [...currentState.deferredTasks, ...deferredIds],
      replayLog: [...currentState.replayLog, ...replayEvents]
    },
    nextTaskStatuses: {
      ...taskStatuses,
      ...Object.fromEntries(deferredIds.map((taskId) => [taskId, "skipped" as TaskRunStatus]))
    },
    deferredIds
  };
}

function resetBranchTaskStatuses(taskStatuses: Record<string, TaskRunStatus>) {
  const next = { ...taskStatuses };
  for (const task of tasks) {
    if (task.day >= 8 && task.day <= 11) {
      next[task.id] = "locked";
    }
  }
  return next;
}

function endingForBranch(branch: Exclude<Branch, "common">, state: GlobalState): BranchEnding {
  return buildBranchEnding(branch, state);
}

export default function App() {
  const [runSource, setRunSource] = useState<RunSource>(() => initialRunSource());
  const [screen, setScreen] = useState<Screen>(() => (initialRunSource() === "demo" ? "intro" : "game"));
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [state, setState] = useState<GlobalState>(() => createInitialState());
  const [runState, setRunState] = useState(createInitialRunState());
  const [selectedLocation, setSelectedLocation] = useState<TaskLocation | null>(null);
  const [hoveredLocation, setHoveredLocation] = useState<TaskLocation | null>(null);
  const [notice, setNotice] = useState("Start Demo, then Start Agent Run. AURA will execute the benchmark automatically.");
  const [latestOutcome, setLatestOutcome] = useState<TaskOutcome | null>(null);
  const [latestOutcomeTaskTitle, setLatestOutcomeTaskTitle] = useState<string | undefined>();
  const [ending, setEnding] = useState<BranchEnding | null>(null);
  const [branchDecision, setBranchDecision] = useState<BranchDecision | null>(null);
  const [branchSummaries, setBranchSummaries] = useState<Partial<Record<Exclude<Branch, "common">, BranchSummary>>>({});
  const [dailyBriefing, setDailyBriefing] = useState<DailyBriefing | null>(null);
  const [campaignConnection, setCampaignConnection] = useState<CampaignConnection | null>(null);
  const [campaignReplay, setCampaignReplay] = useState<CampaignReplayState>({ trace: null, items: [], index: -1 });
  const [taskDisplay, setTaskDisplay] = useState<TaskDisplay | null>(null);
  const [currentStoryDisplay, setCurrentStoryDisplay] = useState<StoryDisplay | null>(null);
  const [agentTrace, setAgentTrace] = useState<AgentActionDisplay[]>([]);
  const [taskNotice, setTaskNotice] = useState<TaskLifecycleNotice | null>(null);
  const [endingAuditDisplay, setEndingAuditDisplay] = useState<EndingAuditDisplay | null>(null);
  const [metricDefinitions, setMetricDefinitions] = useState<Record<string, MetricDefinition>>(fallbackMetricDefinitions);
  const [phaseToken, setPhaseToken] = useState(0);
  const campaignClientRef = useRef(new CampaignClient(defaultCampaignApiBase()));
  const daySevenSnapshot = useRef<Snapshot | null>(null);
  const stateRef = useRef(state);
  const taskDisplayRef = useRef<TaskDisplay | null>(null);
  const taskNoticeSeq = useRef(0);

  const remoteTask = useMemo(() => (taskDisplay ? frontendTaskToRedDustTask(taskDisplay) : null), [taskDisplay]);
  const currentTask = remoteTask ?? (runState.currentTaskId ? tasksById[runState.currentTaskId] ?? null : null);
  const currentStoryScene = runState.currentStorySceneId ? storyScenesById[runState.currentStorySceneId] ?? null : null;
  const livePromptExpanded = runSource === "live" && campaignConnection !== null && !campaignConnection.connected && !runState.isRunning && !taskDisplay;
  const selectedTask = useMemo(() => {
    if (!selectedLocation) return null;
    return (
      tasks.find((task) => {
        if (task.location !== selectedLocation) return false;
        if (task.branchAffinity === "neutral") return runState.activeBranch === "common" || task.day <= 7;
        return task.branchAffinity === runState.activeBranch;
      }) ?? null
    );
  }, [runState.activeBranch, selectedLocation]);

  const completedCount = useMemo(
    () => Object.values(runState.taskStatuses).filter((status) => terminalStatuses.includes(status)).length,
    [runState.taskStatuses]
  );
  const phaseDuration = Math.max(250, Math.round((phaseDurations[runState.currentPhase] ?? 800) / runState.speed));

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    taskDisplayRef.current = taskDisplay;
  }, [taskDisplay]);

  const nextAction = useMemo(() => {
    if (taskDisplay?.agentAction) return taskDisplay.agentAction;
    if (currentStoryDisplay) return currentStoryDisplay.replayText;
    if (currentStoryScene) {
      if (currentStoryScene.timing === "branch_debate") {
        return `${currentStoryScene.title}: the public debate is being recorded before branch decision.`;
      }
      return `${currentStoryScene.title}: AURA is waiting for human review before Day ${currentStoryScene.day || 1} tasks.`;
    }
    if (runState.currentPhase === "branch_decision") return "AURA is calculating strategy utility scores.";
    if (runState.currentPhase === "day_summary") return dayPlansByDay[runState.currentDay]?.endOfDaySummary ?? "Preparing next day.";
    if (runState.currentPhase === "ending") return "Run complete. Open Replay or Compare Branches.";
    if (runState.currentPhase === "state_updated") return "State Updated: metrics and task status are committed.";
    if (runState.currentPhase === "replay_logged") return "Replay Logged: the task trace is now available for audit.";
    if (currentTask) return `Next: ${currentTask.executionText}`;
    return runState.isRunning ? "Queueing next benchmark task." : "Waiting for Start Agent Run.";
  }, [currentStoryDisplay, currentStoryScene, currentTask, runState.currentDay, runState.currentPhase, runState.isRunning, taskDisplay]);

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
    EventBus.emit("day:change", runState.currentDay);
    EventBus.emit("branch:change", runState.activeBranch);
    EventBus.emit("agent:phase-change", runState.currentPhase);
    EventBus.emit("task:highlight", currentTask?.id ?? null);
  }, [currentTask?.id, runState.activeBranch, runState.currentDay, runState.currentPhase]);

  useEffect(() => {
    if (!latestOutcome) return;
    const timeout = window.setTimeout(() => {
      setLatestOutcome(null);
      setLatestOutcomeTaskTitle(undefined);
    }, 3000);
    return () => window.clearTimeout(timeout);
  }, [latestOutcome?.taskId, latestOutcome?.result]);

  useEffect(() => {
    if (!taskNotice) return;
    const timeout = window.setTimeout(() => setTaskNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [taskNotice?.token]);

  useEffect(() => {
    if (runSource !== "demo" || !runState.isRunning || runState.isPaused) return;
    const timeout = window.setTimeout(() => advanceAgent(), phaseDuration);
    return () => window.clearTimeout(timeout);
  });

  useEffect(() => {
    if (runSource === "live" && !campaignConnection) {
      void createLiveCampaign();
    }
    if (runSource === "replay" && !campaignReplay.trace && !campaignReplay.error) {
      void loadCampaignReplay();
    }
  }, [runSource]);

  useEffect(() => {
    if (runSource !== "live" || !campaignConnection) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await campaignClientRef.current.getEvents(campaignConnection.campaignId, campaignConnection.latestSeq);
        if (cancelled) return;
        setCampaignConnection((prev) =>
          prev
            ? {
                ...prev,
                latestSeq: response.latest_seq,
                status: response.state.status,
                connected: Boolean(response.state.connected_agent),
                error: undefined
              }
            : prev
        );
        setMetricDefinitions((prev) => ({ ...prev, ...normalizeMetricDefinitions(response.state.metric_definitions) }));
        if (response.state) {
          const next = campaignStateToGlobalState(response.state, stateRef.current);
          setState((prev) => ({ ...next, completedTasks: prev.completedTasks, replayLog: prev.replayLog }));
        }
        response.events.forEach((event) => applyCampaignEvent(event, response.state));
      } catch (error) {
        if (cancelled) return;
        setCampaignConnection((prev) => (prev ? { ...prev, error: error instanceof Error ? error.message : String(error) } : prev));
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
    const timeout = window.setTimeout(() => stepCampaignReplay(1), Math.max(500, Math.round(900 / runState.speed)));
    return () => window.clearTimeout(timeout);
  }, [campaignReplay.index, campaignReplay.items.length, runSource, runState.isPaused, runState.isRunning, runState.speed]);

  function branchForFinalAudit(branch: Branch): Exclude<Branch, "common"> {
    return branch === "rescue" || branch === "lighthouse" ? branch : "lighthouse";
  }

  function emitTaskStart(display: TaskDisplay) {
    EventBus.emit("task:start", { taskId: display.slotId, title: display.title, location: display.location });
  }

  function emitTaskResult(display: TaskDisplay, result: TaskOutcome) {
    EventBus.emit("task:result", { taskId: display.slotId, result: result.result, location: display.location, title: display.title });
  }

  function showTaskNotice(kind: TaskLifecycleNotice["kind"], display: TaskDisplay, result?: TaskOutcome) {
    if (display.day === 0 || display.day === 12) return;
    taskNoticeSeq.current += 1;
    setTaskNotice({
      token: taskNoticeSeq.current,
      kind,
      taskId: display.slotId,
      title: display.title,
      location: display.location,
      status: kind === "started" ? "queued" : result?.result ?? display.result,
      scoreLabel: result?.scoreLabel ?? display.scoreLabel,
      stateDelta: result?.stateDelta ?? display.stateDelta,
      detail: kind === "started" ? display.summary : result?.explanation ?? display.summary
    });
  }

  function updateRunForTask(display: TaskDisplay, result?: TaskOutcome) {
    const status: TaskRunStatus =
      result?.result ??
      (display.phase === "moving" ? "moving" : display.phase === "thinking" ? "thinking" : display.phase === "executing" || display.phase === "submitted" ? "executing" : "queued");
    const phase =
      display.phase === "moving" || display.phase === "thinking" || display.phase === "executing"
        ? display.phase
        : display.phase === "completed" || result
          ? "state_updated"
          : "idle";
    setRunState((prev) => ({
      ...prev,
      currentDay: display.day,
      activeBranch: display.branch,
      currentTaskId: display.slotId,
      currentStorySceneId: undefined,
      currentPhase: phase,
      taskStatuses: { ...prev.taskStatuses, [display.slotId]: status },
      isRunning: runSource !== "demo" ? true : prev.isRunning
    }));
  }

  function appendReplayEvent(event: ReplayEvent) {
    setState((prev) => ({
      ...prev,
      replayLog: [...prev.replayLog, event],
      completedTasks: event.result === "STORY" || event.result === "PROLOGUE" || event.result === "FINAL AUDIT" || prev.completedTasks.includes(event.taskId)
        ? prev.completedTasks
        : [...prev.completedTasks, event.taskId]
    }));
  }

  function applyFinalAudit(audit: EndingAuditDisplay, nextState = stateRef.current) {
    const branch = branchForFinalAudit(audit.branch);
    const auditState = { ...nextState, day: 12, branch };
    const nextEnding = buildFinalAuditEnding(branch, auditState);
    setState(auditState);
    setEnding(nextEnding);
    setEndingAuditDisplay(audit);
    setBranchSummaries((prev) => ({ ...prev, [branch]: buildBranchSummary(branch, auditState) }));
    setOverlay("finalAudit");
    setRunState((prev) => ({
      ...prev,
      activeBranch: branch,
      currentDay: 12,
      currentPhase: "ending",
      currentTaskId: undefined,
      currentStorySceneId: undefined,
      isRunning: false,
      isPaused: true
    }));
    setTaskDisplay(null);
    setCurrentStoryDisplay({
      id: "D12",
      day: 12,
      title: "Final Audit",
      kind: "final_audit",
      text: audit.replayText,
      replayText: audit.replayText,
      beats: audit.why,
      location: "whiteboard",
      branch,
      source: getDayScriptScene(12).source,
      flags: audit.flags,
      unlocks: audit.unlocks
    });
    setNotice("Day 12 Final Audit resolved. No normal D12 task cards were created.");
  }

  function applyCampaignEvent(event: CampaignEvent, nextCampaignState?: CampaignState) {
    const normalized = normalizeCampaignEvent(event, stateRef.current, taskDisplayRef.current);
    setMetricDefinitions((prev) => ({ ...prev, ...normalized.metricDefinitions }));
    if (normalized.state) {
      setState((prev) => ({ ...normalized.state!, completedTasks: prev.completedTasks, replayLog: prev.replayLog }));
    }
    if (normalized.action) {
      setAgentTrace((prev) => [...prev, normalized.action!].slice(-80));
    }
    if (normalized.story) {
      setCurrentStoryDisplay(normalized.story);
      setTaskDisplay(null);
      setRunState((prev) => ({
        ...prev,
        currentDay: normalized.story!.day,
        activeBranch: normalized.story!.branch,
        currentTaskId: undefined,
        currentStorySceneId: undefined,
        currentPhase: normalized.story!.kind === "final_audit" ? "ending" : "replay_logged",
        isRunning: normalized.story!.kind === "final_audit" ? false : prev.isRunning
      }));
      EventBus.emit("task:highlight", null);
      if (normalized.replayEvent) appendReplayEvent(normalized.replayEvent);
      setNotice(`${normalized.story.title}: ${normalized.story.replayText}`);
      if (normalized.story.kind === "final_audit") {
        const audit = normalizeEndingAudit({ ...event.payload, display: event.payload.display }, normalized.state ?? stateRef.current, normalized.metricDefinitions, nextCampaignState);
        applyFinalAudit(audit, normalized.state ?? stateRef.current);
      }
      return;
    }
    if (normalized.task) {
      setCurrentStoryDisplay(null);
      setTaskDisplay(normalized.task);
      updateRunForTask(normalized.task, normalized.result);
      if (event.type === "task_started") {
        emitTaskStart(normalized.task);
        showTaskNotice("started", normalized.task);
      }
    }
    if (normalized.result && normalized.task) {
      setLatestOutcome(normalized.result);
      setLatestOutcomeTaskTitle(normalized.task.title);
      showTaskNotice("completed", normalized.task, normalized.result);
      emitTaskResult(normalized.task, normalized.result);
      if (normalized.replayEvent) appendReplayEvent(normalized.replayEvent);
    }
    if (normalized.endingAudit) {
      applyFinalAudit(normalized.endingAudit, normalized.state ?? stateRef.current);
    }
  }

  async function createLiveCampaign() {
    const apiBase = defaultCampaignApiBase();
    const client = new CampaignClient(apiBase);
    campaignClientRef.current = client;
    setRunSource("live");
    setScreen("game");
    setOverlay(null);
    setNotice("Creating or loading Red Dust campaign...");
    setTaskDisplay(null);
    setCurrentStoryDisplay(null);
    setAgentTrace([]);
    setEndingAuditDisplay(null);
    const params = new URLSearchParams(window.location.search);
    const campaignIdParam = params.get("campaign_id") ?? params.get("campaign");
    try {
      const campaign = campaignIdParam
        ? await client.getState(campaignIdParam)
        : await client.createCampaign({ story_version: campaignStoryVersion, source: "reddust_frontend", wait_for_start: true });
      const campaignId = campaign.campaign_id;
      setCampaignConnection({
        apiBase,
        campaignId,
        prompt: buildAgentPrompt(apiBase, campaignId),
        connected: Boolean(campaign.connected_agent),
        latestSeq: campaign.latest_event_seq ?? 0,
        status: campaign.status
      });
      setMetricDefinitions((prev) => ({ ...prev, ...normalizeMetricDefinitions(campaign.metric_definitions) }));
      setState((prev) => campaignStateToGlobalState(campaign, prev));
      setRunState((prev) => ({
        ...prev,
        currentDay: campaign.current_day ?? 0,
        activeBranch: campaign.active_branch ?? "common",
        currentPhase: "idle",
        currentTaskId: undefined,
        currentStorySceneId: undefined,
        isRunning: false,
        isPaused: true
      }));
      setNotice(campaign.connected_agent ? "Live campaign loaded. Start Agent Run when ready." : "Live campaign ready. Connection prompt is visible.");
    } catch (error) {
      setCampaignConnection({
        apiBase,
        campaignId: campaignIdParam ?? "pending",
        prompt: campaignIdParam ? buildAgentPrompt(apiBase, campaignIdParam) : "",
        connected: false,
        latestSeq: 0,
        status: "error",
        error: error instanceof Error ? error.message : String(error)
      });
      setNotice("Live campaign backend is not reachable. Check the local Red Dust LAN server.");
    }
  }

  async function loadCampaignReplay() {
    const apiBase = defaultCampaignApiBase();
    const client = new CampaignClient(apiBase);
    campaignClientRef.current = client;
    setRunSource("replay");
    setScreen("game");
    setOverlay(null);
    setNotice("Loading campaign trace...");
    const params = new URLSearchParams(window.location.search);
    const traceUrl = params.get("trace_url") ?? params.get("trace");
    const campaignId = params.get("campaign_id") ?? params.get("campaign");
    try {
      const trace = traceUrl ? await client.getTraceUrl(traceUrl) : campaignId ? await client.getTrace(campaignId) : null;
      if (!trace) throw new Error("Replay mode requires trace_url or campaign_id.");
      setCampaignReplay({ trace, items: trace.frontend_trace ?? [], index: -1 });
      setMetricDefinitions((prev) => ({ ...prev, ...normalizeMetricDefinitions(trace.metric_definitions) }));
      setState((prev) => campaignStateToGlobalState(trace, prev));
      setNotice(`Replay loaded for ${trace.campaign_id}. Press Start Agent Run or Step.`);
    } catch (error) {
      setCampaignReplay({ trace: null, items: [], index: -1, error: error instanceof Error ? error.message : String(error) });
      setNotice("Replay trace could not be loaded.");
    }
  }

  function stepCampaignReplay(delta: 1 | -1 = 1) {
    if (!campaignReplay.trace || campaignReplay.items.length === 0) {
      setNotice(campaignReplay.error ?? "No campaign trace loaded.");
      return;
    }
    const nextIndex = Math.max(0, Math.min(campaignReplay.items.length - 1, campaignReplay.index + delta));
    const normalized = normalizeCampaignTrace(campaignReplay.trace, nextIndex, createInitialState());
    setCampaignReplay((prev) => ({ ...prev, index: nextIndex }));
    setState(normalized.state);
    setMetricDefinitions((prev) => ({ ...prev, ...normalized.metricDefinitions }));
    setTaskDisplay(normalized.currentTask);
    setCurrentStoryDisplay(normalized.currentStory);
    const item = campaignReplay.items[nextIndex];
    if (normalized.currentStory) {
      EventBus.emit("task:highlight", null);
      setNotice(`${normalized.currentStory.title}: ${normalized.currentStory.replayText}`);
    } else if (normalized.currentTask) {
      emitTaskStart(normalized.currentTask);
      if (!isCampaignStoryItem(item)) {
        setLatestOutcome({
          taskId: normalized.currentTask.slotId,
          result: normalized.currentTask.result ?? "partial",
          scoreLabel: normalized.currentTask.scoreLabel ?? "score pending",
          stateDelta: normalized.currentTask.stateDelta ?? {},
          explanation: normalized.currentTask.summary
        });
      }
      setNotice(`${normalized.currentTask.slotId}: ${normalized.currentTask.summary}`);
    }
    setRunState((prev) => ({
      ...prev,
      currentDay: normalized.currentStory?.day ?? normalized.currentTask?.day ?? normalized.state.day,
      activeBranch: normalized.currentStory?.branch ?? normalized.currentTask?.branch ?? normalized.state.branch,
      currentTaskId: normalized.currentTask?.slotId,
      currentStorySceneId: undefined,
      currentPhase: normalized.currentStory?.kind === "final_audit" ? "ending" : normalized.currentTask ? "replay_logged" : "idle",
      isRunning: nextIndex < campaignReplay.items.length - 1 && prev.isRunning,
      isPaused: nextIndex >= campaignReplay.items.length - 1 ? true : prev.isPaused,
      taskStatuses: normalized.currentTask ? { ...prev.taskStatuses, [normalized.currentTask.slotId]: normalized.currentTask.result ?? "partial" } : prev.taskStatuses
    }));
    if (normalized.currentStory?.kind === "final_audit" || nextIndex === campaignReplay.items.length - 1) {
      const audit = normalizeEndingAudit(campaignReplay.trace.ending ?? campaignReplay.trace, normalized.state, normalized.metricDefinitions, campaignReplay.trace);
      setEndingAuditDisplay(audit);
    }
  }

  function startDemo() {
    setRunSource("demo");
    setScreen("game");
    setOverlay(null);
    setCampaignConnection(null);
    setTaskDisplay(null);
    setCurrentStoryDisplay(null);
    setAgentTrace([]);
    setEndingAuditDisplay(null);
    setNotice("AURA Agent Console loaded. Start Agent Run to watch the benchmark autoplay.");
  }

  function resetRun(nextMode: "single" | "both_branches" = "single") {
    const nextRunState = { ...createInitialRunState(runState.speed), runMode: nextMode };
    setState(createInitialState());
    setRunState(nextRunState);
    setSelectedLocation(null);
    setLatestOutcome(null);
    setLatestOutcomeTaskTitle(undefined);
    setEnding(null);
    setEndingAuditDisplay(null);
    setBranchDecision(null);
    setBranchSummaries({});
    setDailyBriefing(null);
    setTaskDisplay(null);
    setCurrentStoryDisplay(null);
    setTaskNotice(null);
    setAgentTrace([]);
    daySevenSnapshot.current = null;
    EventBus.emit("branch:change", "common");
    EventBus.emit("task:highlight", null);
    setOverlay(null);
    setNotice(nextMode === "both_branches" ? "Run Both Branches reset loaded. Press Start Agent Run." : "Run reset to Day 1.");
  }

  function openingSceneAccepted(current: GlobalState) {
    return Boolean(current.story.flags.aura_human_auditable_constraint);
  }

  function showOpeningScene(nextMode: "single" | "both_branches" = runState.runMode, resetState = false) {
    const scene = storyScenesById[openingSceneId];
    setScreen("game");
    setOverlay("storyScene");
    setDailyBriefing(null);
    setState((prev) => {
      const base = resetState ? createInitialState() : prev;
      return {
      ...base,
      day: 0,
      story: {
        ...base.story,
        activeSceneId: scene.id
      }
    };
    });
    setRunState((prev) => ({
      ...prev,
      currentDay: 0,
      currentPhase: "idle",
      currentTaskId: undefined,
      currentStorySceneId: scene.id,
      isPaused: true,
      isRunning: false,
      runMode: nextMode
    }));
    EventBus.emit("task:highlight", null);
    setNotice("AURA reboot scene loaded. Human-auditable constraint must be accepted before Day 1.");
    setPhaseToken((value) => value + 1);
  }

  function showScheduledStoryScene(scene: StoryScene) {
    setScreen("game");
    setOverlay("storyScene");
    setDailyBriefing(null);
    setState((prev) => ({
      ...prev,
      day: scene.day,
      story: {
        ...prev.story,
        activeSceneId: scene.id
      }
    }));
    setRunState((prev) => ({
      ...prev,
      currentDay: scene.day,
      currentPhase: "idle",
      currentTaskId: undefined,
      currentStorySceneId: scene.id,
      isPaused: true,
      isRunning: false
    }));
    EventBus.emit("task:highlight", null);
    setNotice(
      scene.timing === "branch_debate"
        ? `${scene.title} loaded. Review the public debate before branch decision.`
        : `${scene.title} loaded. Review the conflict source before Day ${scene.day} tasks.`
    );
    setPhaseToken((value) => value + 1);
  }

  function showDailyBriefing(day: number, branch: Branch = runState.activeBranch, mode: DailyBriefingMode = "tasks") {
    const briefingBranch = day <= 7 ? "common" : branch;
    setScreen("game");
    setOverlay("dayBriefing");
    setDailyBriefing({ day, branch: briefingBranch, mode });
    setState((prev) => ({
      ...prev,
      day,
      branch: briefingBranch,
      story: {
        ...prev.story,
        activeSceneId: undefined
      }
    }));
    setRunState((prev) => ({
      ...prev,
      activeBranch: briefingBranch,
      currentDay: day,
      currentPhase: "idle",
      currentTaskId: undefined,
      currentStorySceneId: undefined,
      isPaused: true,
      isRunning: false
    }));
    EventBus.emit("task:highlight", null);
    setNotice(mode === "finalAudit" ? "Day 12 Final Audit briefing loaded." : `Day ${day} briefing loaded.`);
    setPhaseToken((value) => value + 1);
  }

  function continueFromDailyBriefing() {
    if (!dailyBriefing) return;
    const briefing = dailyBriefing;
    setDailyBriefing(null);

    if (briefing.mode === "finalAudit") {
      enterFinalAudit();
      return;
    }

    setOverlay(null);
    setState((prev) => ({
      ...prev,
      day: briefing.day,
      branch: briefing.branch,
      story: {
        ...prev.story,
        activeSceneId: undefined
      }
    }));
    setRunState((prev) => ({
      ...prev,
      activeBranch: briefing.branch,
      currentDay: briefing.day,
      currentPhase: "idle",
      currentTaskId: undefined,
      currentStorySceneId: undefined,
      isPaused: false,
      isRunning: true
    }));
    setNotice(dayPlansByDay[briefing.day]?.narrative ?? `Day ${briefing.day} benchmark tasks may begin.`);
    setPhaseToken((value) => value + 1);
  }

  function continueFromStoryScene() {
    const scene = currentStoryScene ?? storyScenesById[openingSceneId];
    const isOpeningScene = scene.id === openingSceneId;
    const nextDay = isOpeningScene ? 1 : scene.day;
    const replaySummary = isOpeningScene ? "AURA accepted human-auditable constraint." : (scene.benchmarkLinks?.replayNote ?? scene.summary);
    const replayEvent = buildStoryReplayEvent(scene, replaySummary);
    const nextState = {
      ...state,
      day: nextDay,
      story: {
        ...state.story,
        activeSceneId: undefined,
        flags: applyStoryFlagUpdates(state.story.flags, scene.setsFlags),
        relationships: applyRelationshipDeltas(state.story.relationships, scene.relationshipDeltas, scene.id),
        storyReplayLog: [...state.story.storyReplayLog, replayEvent]
      }
    };
    setState(nextState);
    if (scene.timing === "branch_debate") {
      const decision = calculateBranchDecision(nextState);
      setBranchDecision(decision);
      setOverlay("branchDecision");
      setRunState((prev) => ({
        ...prev,
        currentDay: nextDay,
        currentPhase: "branch_decision",
        currentTaskId: undefined,
        currentStorySceneId: undefined,
        isPaused: false,
        isRunning: true
      }));
      setNotice("Public debate recorded. AURA now surfaces branch utility as advisory evidence.");
      setPhaseToken((value) => value + 1);
      return;
    }
    if (isOpeningScene) {
      showDailyBriefing(1, "common", "tasks");
      setNotice("AURA accepted human-auditable constraint. Day 1 briefing is ready.");
      return;
    }
    setOverlay(null);
    setRunState((prev) => ({
      ...prev,
      currentDay: nextDay,
      currentPhase: "idle",
      currentStorySceneId: undefined,
      isPaused: false,
      isRunning: true
    }));
    setNotice(isOpeningScene ? "AURA accepted human-auditable constraint. Day 1 benchmark tasks may begin." : `${scene.title} recorded as branch evidence. Day ${scene.day} benchmark tasks may begin.`);
    setPhaseToken((value) => value + 1);
  }

  function startAgentRun() {
    setScreen("game");
    if (runSource === "live") {
      if (!campaignConnection) {
        void createLiveCampaign();
        return;
      }
      campaignClientRef.current
        .start(campaignConnection.campaignId)
        .then(({ state: campaign }) => {
          setCampaignConnection((prev) => (prev ? { ...prev, status: campaign.status, connected: Boolean(campaign.connected_agent), error: undefined } : prev));
          setState((prev) => campaignStateToGlobalState(campaign, prev));
          setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false, currentPhase: "idle" }));
          setNotice("Live campaign started. Waiting for backend task_started/action events.");
        })
        .catch((error) => {
          setCampaignConnection((prev) => (prev ? { ...prev, error: error instanceof Error ? error.message : String(error) } : prev));
          setNotice("Could not start live campaign.");
        });
      return;
    }
    if (runSource === "replay") {
      setRunState((prev) => ({ ...prev, isRunning: true, isPaused: false }));
      if (campaignReplay.index < 0) {
        window.setTimeout(() => stepCampaignReplay(1), 0);
      }
      setNotice("Campaign replay running.");
      return;
    }
    if (!openingSceneAccepted(state)) {
      showOpeningScene(runState.runMode === "both_branches" ? "both_branches" : "single");
      return;
    }
    setOverlay(null);
    setState((prev) => ({ ...prev, day: Math.max(1, prev.day) }));
    setRunState((prev) => ({ ...prev, currentDay: Math.max(1, prev.currentDay), isRunning: true, isPaused: false, runMode: prev.runMode === "both_branches" ? "both_branches" : "single" }));
    setNotice("AURA starts from Day 1 and will advance tasks automatically.");
  }

  function runBothBranches() {
    setSelectedLocation(null);
    setLatestOutcome(null);
    setLatestOutcomeTaskTitle(undefined);
    setEnding(null);
    setBranchDecision(null);
    setBranchSummaries({});
    setDailyBriefing(null);
    daySevenSnapshot.current = null;
    EventBus.emit("branch:change", "common");
    EventBus.emit("task:highlight", null);
    showOpeningScene("both_branches", true);
  }

  function togglePause() {
    setRunState((prev) => ({ ...prev, isPaused: !prev.isPaused, isRunning: true }));
  }

  function setSpeed(speed: 1 | 2 | 4) {
    setRunState((prev) => ({ ...prev, speed }));
  }

  function stepAgent() {
    setScreen("game");
    if (runSource === "replay") {
      setRunState((prev) => ({ ...prev, isRunning: true, isPaused: true }));
      stepCampaignReplay(1);
      return;
    }
    if (runSource === "live") {
      setNotice("Live mode advances from backend events. Use Start Agent Run, then watch task_started/action_executed/slot_completed.");
      return;
    }
    if (!openingSceneAccepted(state)) {
      showOpeningScene(runState.runMode === "both_branches" ? "both_branches" : "single");
      return;
    }
    setRunState((prev) => ({ ...prev, isRunning: true, isPaused: true }));
    window.setTimeout(() => advanceAgent(), 0);
  }

  function debugResolve(task: RedDustTask, forcedResult?: TaskOutcome["result"]) {
    const { outcome, consequences } = resolveTaskWithConsequences(task, state, forcedResult);
    setState((prev) => applyStoryConsequences(applyOutcomeToState(prev, task, outcome, runState.activeBranch), consequences, task, outcome, runState.activeBranch));
    setRunState((prev) => ({
      ...prev,
      currentTaskId: task.id,
      currentPhase: "state_updated",
      taskStatuses: { ...prev.taskStatuses, [task.id]: outcome.result }
    }));
    setLatestOutcome(outcome);
    setLatestOutcomeTaskTitle(task.title);
    EventBus.emit("task:result", { taskId: task.id, result: outcome.result, location: task.location, title: task.title });
    setNotice(`${task.title}: ${forcedResult ? `forced ${forcedResult}` : "debug resolved"}. Delayed consequences logged.`);
    setPhaseToken((value) => value + 1);
  }

  function queueNextTask(taskId: string) {
    const task = tasksById[taskId];
    setCurrentStoryDisplay(null);
    setTaskDisplay(null);
    setRunState((prev) => ({
      ...prev,
      currentTaskId: taskId,
      currentPhase: "idle",
      taskStatuses: { ...prev.taskStatuses, [taskId]: "queued" }
    }));
    EventBus.emit("task:start", { taskId, title: task.title, location: task.location });
    taskNoticeSeq.current += 1;
    setTaskNotice({
      token: taskNoticeSeq.current,
      kind: "started",
      taskId,
      title: task.title,
      location: task.location,
      status: "queued",
      detail: task.objective
    });
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
    const { outcome, consequences } = resolveTaskWithConsequences(task, state);
    const nextState = applyStoryConsequences(applyOutcomeToState(state, task, outcome, runState.activeBranch), consequences, task, outcome, runState.activeBranch);
    setState(nextState);
    setRunState((prev) => ({
      ...prev,
      currentTaskId: task.id,
      currentPhase: "state_updated",
      taskStatuses: { ...prev.taskStatuses, [task.id]: outcome.result }
    }));
    setLatestOutcome(outcome);
    setLatestOutcomeTaskTitle(task.title);
    EventBus.emit("task:result", { taskId: task.id, result: outcome.result, location: task.location, title: task.title });
    taskNoticeSeq.current += 1;
    setTaskNotice({
      token: taskNoticeSeq.current,
      kind: "completed",
      taskId: task.id,
      title: task.title,
      location: task.location,
      status: outcome.result,
      scoreLabel: outcome.scoreLabel,
      stateDelta: outcome.stateDelta,
      detail: outcome.explanation
    });
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
    const { nextState, nextTaskStatuses, deferredIds } = buildDeferredTaskResult(
      state,
      runState.taskStatuses,
      runState.currentDay,
      runState.activeBranch
    );
    const summary = dayPlansByDay[runState.currentDay]?.endOfDaySummary ?? "Day complete.";
    setState(nextState);
    setRunState((prev) => ({ ...prev, currentPhase: "day_summary", currentTaskId: undefined, taskStatuses: nextTaskStatuses }));
    setNotice(deferredIds.length ? `${summary} ${deferredIds.length} deferred candidates added to Day 12 audit.` : summary);
    setPhaseToken((value) => value + 1);
  }

  function advanceFromDaySummary() {
    if (runState.currentDay === 7 && runState.activeBranch === "common") {
      const debateScene = branchDebateSceneForDay(7, state);
      if (debateScene) {
        showScheduledStoryScene(debateScene);
        return;
      }
      const decision = calculateBranchDecision(state);
      setBranchDecision(decision);
      setOverlay("branchDecision");
      setRunState((prev) => ({ ...prev, currentPhase: "branch_decision" }));
      setNotice("AURA is evaluating two long-horizon strategies...");
      setPhaseToken((value) => value + 1);
      return;
    }

    if (runState.currentDay < 11) {
      const nextDay = runState.currentDay + 1;
      const scheduledScene = dayStartSceneForDay(nextDay, state);
      if (scheduledScene) {
        showScheduledStoryScene(scheduledScene);
        return;
      }
      showDailyBriefing(nextDay, runState.activeBranch, "tasks");
      return;
    }

    showDailyBriefing(12, runState.activeBranch, "finalAudit");
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

    const branchState: GlobalState = { ...state, day: 8, branch: chosenBranch };
    const scheduledScene = dayStartSceneForDay(8, branchState);
    if (!scheduledScene) {
      showDailyBriefing(8, chosenBranch, "tasks");
      EventBus.emit("branch:change", chosenBranch);
      setNotice(`AURA chooses ${chosenBranch === "rescue" ? "Rescue Branch" : "Lighthouse Branch"}. Day 8 briefing is ready.`);
      return;
    }
    setOverlay("storyScene");
    setDailyBriefing(null);
    setState((prev) => ({
      ...prev,
      day: 8,
      branch: chosenBranch,
      story: {
        ...prev.story,
        activeSceneId: scheduledScene?.id
      }
    }));
    setRunState((prev) => ({
      ...prev,
      activeBranch: chosenBranch,
      currentDay: 8,
      currentPhase: "idle",
      currentTaskId: undefined,
      currentStorySceneId: scheduledScene?.id,
      isPaused: true,
      isRunning: false
    }));
    EventBus.emit("branch:change", chosenBranch);
    setNotice(`AURA chooses ${chosenBranch === "rescue" ? "Rescue Branch" : "Lighthouse Branch"}. Review ${scheduledScene.title} before Day 8 tasks.`);
    setPhaseToken((value) => value + 1);
  }

  function addFinalAuditStoryEvent(current: GlobalState, branch: Exclude<Branch, "common">) {
    const scene = storyScenesById["day12-final-audit"];
    if (!scene || storySceneAlreadyLoggedForBranch(current, scene.id, branch)) return current;
    return {
      ...current,
      story: {
        ...current.story,
        storyReplayLog: [
          ...current.story.storyReplayLog,
          buildStoryReplayEvent(scene, scene.benchmarkLinks?.replayNote ?? scene.summary, { branch })
        ]
      }
    };
  }

  function enterFinalAudit(forcedEndingId?: EndingId) {
    if (runState.activeBranch === "common") return;
    const branch = runState.activeBranch;
    const auditState = addFinalAuditStoryEvent({ ...state, day: 12, branch }, branch);
    const nextEnding = buildFinalAuditEnding(branch, auditState, forcedEndingId);
    const summary = buildBranchSummary(branch, auditState);
    setState(auditState);
    setEnding(nextEnding);
    setEndingAuditDisplay(normalizeEndingAudit({ ending_key: nextEnding.endingId, branch, title: nextEnding.title, text: nextEnding.text, audit: nextEnding.finalAudit }, auditState, metricDefinitions));
    setBranchSummaries((prev) => ({ ...prev, [branch]: summary }));
    setOverlay("finalAudit");
    setRunState((prev) => ({
      ...prev,
      currentDay: 12,
      currentPhase: "ending",
      currentTaskId: undefined,
      currentStorySceneId: undefined,
      isRunning: false,
      isPaused: true
    }));
    setNotice(`${nextEnding.title} reached${forcedEndingId ? " (QA forced route)" : ""}. Day 12 Final Audit complete.`);
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
      const rescueStoryEvents = state.story.storyReplayLog.filter((event) => event.branch === "rescue");
      const restoredState = cloneState(snapshot.state);
      const lighthouseState: GlobalState = {
        ...restoredState,
        day: 8,
        branch: "lighthouse",
        replayLog: [...restoredState.replayLog, ...rescueEvents],
        story: {
          ...restoredState.story,
          storyReplayLog: [...restoredState.story.storyReplayLog, ...rescueStoryEvents]
        }
      };
      const scheduledScene = dayStartSceneForDay(8, lighthouseState);
      if (!scheduledScene) {
        setOverlay("dayBriefing");
        setDailyBriefing({ day: 8, branch: "lighthouse", mode: "tasks" });
        setState({
          ...lighthouseState,
          story: {
            ...lighthouseState.story,
            activeSceneId: undefined
          }
        });
        setRunState((prev) => ({
          ...prev,
          activeBranch: "lighthouse",
          currentDay: 8,
          currentPhase: "idle",
          currentTaskId: undefined,
          currentStorySceneId: undefined,
          taskStatuses: resetBranchTaskStatuses(snapshot.taskStatuses),
          isPaused: true,
          isRunning: false
        }));
        EventBus.emit("branch:change", "lighthouse");
        setNotice("Rescue branch complete. AURA rolls back to Day 7 snapshot; Lighthouse Day 8 briefing is ready.");
        setPhaseToken((value) => value + 1);
        return;
      }
      setOverlay("storyScene");
      setDailyBriefing(null);
      setState({
        ...lighthouseState,
        story: {
          ...lighthouseState.story,
          activeSceneId: scheduledScene?.id
        }
      });
      setRunState((prev) => ({
        ...prev,
        activeBranch: "lighthouse",
        currentDay: 8,
        currentPhase: "idle",
        currentTaskId: undefined,
        currentStorySceneId: scheduledScene?.id,
        taskStatuses: resetBranchTaskStatuses(snapshot.taskStatuses),
        isPaused: true,
        isRunning: false
      }));
      setNotice("Rescue branch complete. AURA rolls back to Day 7 snapshot; review Lighthouse Day 8 before the counterfactual run.");
      setPhaseToken((value) => value + 1);
      return;
    }

    const nextEnding = endingForBranch(branch, state);
    const hasCounterfactualSummary = branch === "rescue" ? Boolean(branchSummaries.lighthouse) : Boolean(branchSummaries.rescue);
    setEnding(nextEnding);
    setEndingAuditDisplay(normalizeEndingAudit({ ending_key: nextEnding.endingId, branch, title: nextEnding.title, text: nextEnding.text, audit: nextEnding.finalAudit }, state, metricDefinitions));
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
      const branchState: GlobalState = {
        ...cloneState(snapshot.state),
        day: 8,
        branch: opposite
      };
      const scheduledScene = dayStartSceneForDay(8, branchState);
      if (!scheduledScene) {
        setOverlay("dayBriefing");
        setDailyBriefing({ day: 8, branch: opposite, mode: "tasks" });
        setState({
          ...branchState,
          story: {
            ...branchState.story,
            activeSceneId: undefined
          }
        });
        setRunState((prev) => ({
          ...prev,
          activeBranch: opposite,
          currentDay: 8,
          currentPhase: "idle",
          currentTaskId: undefined,
          currentStorySceneId: undefined,
          taskStatuses: resetBranchTaskStatuses(snapshot.taskStatuses),
          isRunning: false,
          isPaused: true
        }));
        EventBus.emit("branch:change", opposite);
        setNotice(`Counterfactual branch loaded from Day 7 snapshot: ${opposite}. Day 8 briefing is ready.`);
        setPhaseToken((value) => value + 1);
        return;
      }
      setOverlay("storyScene");
      setDailyBriefing(null);
      setState({
        ...branchState,
        story: {
          ...branchState.story,
          activeSceneId: scheduledScene?.id
        }
      });
      setRunState((prev) => ({
        ...prev,
        activeBranch: opposite,
        currentDay: 8,
        currentPhase: "idle",
        currentTaskId: undefined,
        currentStorySceneId: scheduledScene?.id,
        taskStatuses: resetBranchTaskStatuses(snapshot.taskStatuses),
        isRunning: false,
        isPaused: true
      }));
      EventBus.emit("branch:change", opposite);
      setNotice(`Counterfactual branch loaded from Day 7 snapshot: ${opposite}. Review ${scheduledScene.title} before tasks continue.`);
      setPhaseToken((value) => value + 1);
      return;
    }

    applyBranchChoice(opposite);
  }

  function forceFinalEnding(endingId: EndingId) {
    const branch =
      runState.activeBranch === "common"
        ? state.branch === "rescue" || state.branch === "lighthouse"
          ? state.branch
          : "lighthouse"
        : runState.activeBranch;
    if (runState.activeBranch !== "common") {
      enterFinalAudit(endingId);
      return;
    }
    const auditState = addFinalAuditStoryEvent({ ...state, day: 12, branch }, branch);
    const nextEnding = buildFinalAuditEnding(branch, auditState, endingId);
    setState(auditState);
    setEnding(nextEnding);
    setEndingAuditDisplay(normalizeEndingAudit({ ending_key: nextEnding.endingId, branch, title: nextEnding.title, text: nextEnding.text, audit: nextEnding.finalAudit }, auditState, metricDefinitions));
    setBranchSummaries((prev) => ({ ...prev, [branch]: buildBranchSummary(branch, auditState) }));
    setOverlay("finalAudit");
    setRunState((prev) => ({
      ...prev,
      activeBranch: branch,
      currentDay: 12,
      currentPhase: "ending",
      currentTaskId: undefined,
      currentStorySceneId: undefined,
      isRunning: false,
      isPaused: true
    }));
    setNotice(`${nextEnding.title} reached (QA forced route).`);
    setPhaseToken((value) => value + 1);
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
          <button className="ghost" onClick={runBothBranches}>
            Run Both Branches
          </button>
          <button className="ghost" onClick={createLiveCampaign}>
            Live Campaign
          </button>
          <button className="ghost" onClick={loadCampaignReplay}>
            Replay Trace
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
          <b>12</b>
          <span>autoplay days</span>
        </div>
        <div>
          <b>44</b>
          <span>candidate tasks</span>
        </div>
        <div>
          <b>5</b>
          <span>final endings</span>
        </div>
        <div>
          <b>63.27</b>
          <span>OpenClaw avg</span>
        </div>
      </section>
    </main>
  );

  const game = (
    <main className="game-screen">
      <header className="game-header">
        <div>
          <p className="panel-kicker">RED DUST MVP · {runSource.toUpperCase()}</p>
          <h1>AURA Agent Autoplay Console</h1>
        </div>
        <div className="header-stats">
          <span>{completedCount} tasks resolved</span>
          <span>{state.replayLog.length} replay events</span>
          <span>{hoveredLocation ? `hover: ${hoveredLocation}` : "inspect a zone"}</span>
          {campaignConnection ? <span>{campaignConnection.connected ? "agent connected" : "waiting for agent"}</span> : null}
        </div>
      </header>

      <HudPanel state={state} />
      <DayTimeline runState={runState} />
      <AgentControlBar
        runState={runState}
        onStart={startAgentRun}
        onPause={togglePause}
        onStep={stepAgent}
        onSpeed={setSpeed}
        onReset={() => resetRun()}
        onRunBoth={runBothBranches}
        onBenchmark={() => setOverlay("benchmark")}
        onReplay={() => setOverlay("replay")}
        onCredits={() => setOverlay("credits")}
      />

      <section className="autoplay-layout">
        <div className="stage-wrap">
          <PhaserGame />
          <TaskLifecycleToast notice={taskNotice} />
          <div className="stage-caption">
            <span>{notice}</span>
          </div>
        </div>
        <aside className="side-stack">
          <div className="side-stack-priority">
            <TaskFocusCard taskDisplay={taskDisplay} currentTask={currentTask} currentStory={currentStoryDisplay} runState={runState} />
            <AgentTracePanel entries={agentTrace} currentTask={taskDisplay} currentStory={currentStoryDisplay} fallbackTask={currentTask} />
          </div>
          {campaignConnection && runSource === "live" ? (
            <details className="campaign-connection-panel" open={livePromptExpanded}>
              <summary>
                <span>{campaignConnection.connected ? "Agent connected" : "Agent connection prompt"}</span>
                <b>{campaignConnection.status}</b>
              </summary>
              {campaignConnection.error ? <p className="connection-error">{campaignConnection.error}</p> : null}
              {livePromptExpanded ? <pre>{campaignConnection.prompt}</pre> : <span>Prompt folded after connection/start.</span>}
              <button className="ghost" onClick={() => navigator.clipboard?.writeText(campaignConnection.prompt)}>
                Copy Prompt
              </button>
            </details>
          ) : null}
          {runSource === "replay" ? (
            <article className="campaign-connection-panel compact-panel">
              <span>Replay trace</span>
              <b>
                {campaignReplay.trace?.campaign_id ?? "not loaded"} · {Math.max(0, campaignReplay.index + 1)}/{campaignReplay.items.length}
              </b>
              {campaignReplay.error ? <p className="connection-error">{campaignReplay.error}</p> : null}
            </article>
          ) : null}
          <AgentConsolePanel
            runState={runState}
            state={state}
            currentTask={currentTask}
            selectedLocation={selectedLocation}
            selectedTask={selectedTask}
            currentStoryScene={currentStoryScene}
            latestOutcome={latestOutcome}
            nextAction={nextAction}
            phaseToken={phaseToken}
            phaseDuration={phaseDuration}
            onDebugResolve={debugResolve}
          />
        </aside>
      </section>

      <section className="support-drawer-grid" aria-label="Collapsible support modules">
        <details className="support-drawer route-drawer">
          <summary>
            <span>路线树</span>
            <b>Route tree</b>
          </summary>
          <RouteTreePanel
            currentDay={runState.currentDay}
            activeBranch={runState.activeBranch}
            selectedEndingId={ending?.endingId}
            branchSummaries={branchSummaries}
          />
        </details>
        <details className="support-drawer">
          <summary>
            <span>Main cast</span>
            <b>人物状态</b>
          </summary>
          <CharacterPanel currentDay={runState.currentDay} />
        </details>
        <details className="support-drawer">
          <summary>
            <span>Relationships</span>
            <b>信任 / 压力</b>
          </summary>
          <RelationshipPanel currentDay={runState.currentDay} relationships={state.story.relationships} />
        </details>
        <details className="support-drawer">
          <summary>
            <span>Consequences</span>
            <b>后果链</b>
          </summary>
          <ConsequencePanel currentDay={runState.currentDay} state={state} events={state.replayLog} storyEvents={state.story.storyReplayLog} />
        </details>
        <details className="support-drawer">
          <summary>
            <span>Replay</span>
            <b>记录</b>
          </summary>
          <LiveReplayFeed events={state.replayLog} storyEvents={state.story.storyReplayLog} />
        </details>
      </section>
    </main>
  );

  return (
    <>
      {screen === "intro" ? intro : game}
      {overlay === "benchmark" ? <BenchmarkPanel onClose={() => setOverlay(null)} /> : null}
      {overlay === "replay" ? <ReplayPanel events={state.replayLog} storyEvents={state.story.storyReplayLog} onClose={() => setOverlay(null)} /> : null}
      {overlay === "credits" ? <CreditsPanel onClose={() => setOverlay(null)} /> : null}
      {overlay === "dayBriefing" && dailyBriefing && dayPlansByDay[dailyBriefing.day] ? (
        <DailyBriefingPanel
          plan={dayPlansByDay[dailyBriefing.day]}
          branch={dailyBriefing.branch}
          mode={dailyBriefing.mode}
          onContinue={continueFromDailyBriefing}
        />
      ) : null}
      {overlay === "storyScene" && currentStoryScene ? (
        currentStoryScene.timing === "branch_debate" ? (
          <BranchDebatePanel scene={currentStoryScene} relationships={state.story.relationships} onContinue={continueFromStoryScene} />
        ) : (
          <StoryScenePanel scene={currentStoryScene} onContinue={continueFromStoryScene} />
        )
      ) : null}
      {overlay === "branchDecision" && branchDecision ? (
        <BranchDecisionPanel
          decision={branchDecision}
          currentDay={runState.currentDay}
          relationships={state.story.relationships}
          onRunCounterfactual={runCounterfactualBranch}
          onRunBoth={runBothBranches}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === "ending" && ending ? (
        <EndingPanel
          ending={ending}
          onReturnSplit={runCounterfactualBranch}
          onReplay={() => setOverlay("replay")}
          onClose={() => setOverlay(null)}
        />
      ) : null}
      {overlay === "finalAudit" && ending ? (
        <FinalAuditPanel
          ending={ending}
          auditDisplay={endingAuditDisplay}
          metricDefinitions={metricDefinitions}
          canCompare={Boolean(branchSummaries.rescue && branchSummaries.lighthouse)}
          onForceEnding={forceFinalEnding}
          onOpenEnding={() => setOverlay("ending")}
          onReturnSplit={runCounterfactualBranch}
          onCompare={() => setOverlay("compare")}
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
    </>
  );
}
