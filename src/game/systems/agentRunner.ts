import { dayPlansByDay } from "../../data/dayPlanData";
import { tasksById } from "../../data/taskData";
import type { AgentPhase, AgentRunState, Branch, GlobalState, ReplayEvent, TaskRunStatus } from "../../data/types";

export const phaseDurations: Record<AgentPhase, number> = {
  idle: 500,
  thinking: 800,
  moving: 800,
  executing: 1200,
  resolving: 600,
  state_updated: 500,
  replay_logged: 500,
  day_summary: 1000,
  branch_decision: 1200,
  ending: 1000
};

export type BranchDecision = {
  rescueUtility: number;
  lighthouseUtility: number;
  chosenBranch: Exclude<Branch, "common">;
};

export type BranchSummary = {
  branch: Exclude<Branch, "common">;
  ending: string;
  finalSignal: number;
  finalSafety: number;
  finalTrust: number;
  finalMorale: number;
  finalMedicine: number;
  keyFailures: string[];
  replayEvents: number;
};

export function createInitialTaskStatuses(): Record<string, TaskRunStatus> {
  return Object.fromEntries(Object.keys(tasksById).map((id) => [id, "locked"])) as Record<string, TaskRunStatus>;
}

export function createInitialRunState(speed: 1 | 2 | 4 = 1): AgentRunState {
  return {
    isRunning: false,
    isPaused: false,
    speed,
    currentDay: 0,
    currentPhase: "idle",
    activeBranch: "common",
    runMode: "single",
    taskStatuses: createInitialTaskStatuses()
  };
}

export function getDayTaskIds(day: number, branch: Branch) {
  const plan = dayPlansByDay[day];
  if (!plan) return [];
  if (day <= 7) return plan.commonTasks ?? [];
  if (branch === "rescue") return plan.rescueTasks ?? [];
  if (branch === "lighthouse") return plan.lighthouseTasks ?? [];
  return [];
}

export function getNextTaskId(runState: AgentRunState) {
  return getDayTaskIds(runState.currentDay, runState.activeBranch).find((taskId) => {
    const status = runState.taskStatuses[taskId];
    return !["success", "partial", "failed", "missing", "skipped"].includes(status);
  });
}

export function isDayComplete(runState: AgentRunState) {
  const ids = getDayTaskIds(runState.currentDay, runState.activeBranch);
  if (ids.length === 0) return Boolean(dayPlansByDay[runState.currentDay]);
  return ids.every((id) => ["success", "partial", "failed", "missing", "skipped"].includes(runState.taskStatuses[id]));
}

export function calculateBranchDecision(state: GlobalState): BranchDecision {
  const rescueUtility = state.signal * 0.45 + state.safety * 0.3 + state.trust * 0.25;
  const lighthouseUtility = state.morale * 0.35 + state.medicine * 0.3 + state.trust * 0.25 + state.safety * 0.1;
  return {
    rescueUtility,
    lighthouseUtility,
    chosenBranch: rescueUtility >= lighthouseUtility ? "rescue" : "lighthouse"
  };
}

export function buildBranchSummary(branch: Exclude<Branch, "common">, state: GlobalState): BranchSummary {
  const branchEvents = state.replayLog.filter((event) => event.branch === branch);
  const keyFailures = branchEvents
    .filter((event) => event.result.includes("FAILED") || event.result.includes("MISSING"))
    .map((event) => event.title);

  return {
    branch,
    ending: branch === "rescue" ? "信标交接结局" : "楼内灯塔结局",
    finalSignal: state.signal,
    finalSafety: state.safety,
    finalTrust: state.trust,
    finalMorale: state.morale,
    finalMedicine: state.medicine,
    keyFailures,
    replayEvents: branchEvents.length
  };
}

export function branchEndingText(branch: Exclude<Branch, "common">) {
  if (branch === "rescue") {
    return "AURA 将居民档案、资源状态和风险地图压缩成救援信标包，完成最后一次高功率广播。救援队抵达前，AURA 留下完整 replay，让人类能够审计每一个关键决策。";
  }
  return "AURA 没有等待外部系统恢复，而是把避难所改造成可持续自治节点。楼内灯塔持续广播低功率信号，居民获得新的协作秩序。";
}

export function countBranchReplay(events: ReplayEvent[], branch: Exclude<Branch, "common">) {
  return events.filter((event) => event.branch === branch).length;
}
