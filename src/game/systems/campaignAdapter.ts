import { initialState } from "../../data/taskData";
import type { CampaignFrontendTask, CampaignReplayItem } from "../../data/campaignClient";
import { getScriptCandidateForId, getScriptCandidateForRealTaskId } from "../../data/scriptSceneData";
import type { Branch, GlobalState, RedDustTask, ReplayEvent, TaskCategory, TaskLocation, TaskOutcome } from "../../data/types";

const categoryFallback: TaskCategory = "planning";
const locationFallback: TaskLocation = "whiteboard";

function asBranch(value: unknown): Branch {
  return value === "rescue" || value === "lighthouse" ? value : "common";
}

function asLocation(value: unknown): TaskLocation {
  const allowed: TaskLocation[] = ["water", "medical", "security", "ventilation", "communication", "whiteboard", "residents", "beacon"];
  return allowed.includes(value as TaskLocation) ? (value as TaskLocation) : locationFallback;
}

function asCategory(value: unknown): TaskCategory {
  const allowed: TaskCategory[] = ["safety", "retrieval", "creative", "classification", "puzzle", "vision", "planning", "resource", "social"];
  return allowed.includes(value as TaskCategory) ? (value as TaskCategory) : categoryFallback;
}

function metric(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function campaignStateToGlobalState(raw: Record<string, unknown>, previous: GlobalState = initialState): GlobalState {
  const branch = asBranch(raw.branch ?? previous.branch);
  return {
    ...previous,
    ...raw,
    day: metric(raw.day, previous.day),
    water: metric(raw.water, previous.water),
    medicine: metric(raw.medicine, previous.medicine),
    trust: metric(raw.trust, previous.trust),
    safety: metric(raw.safety, previous.safety),
    signal: metric(raw.signal, previous.signal),
    morale: metric(raw.morale, previous.morale),
    branch,
    completedTasks: previous.completedTasks,
    replayLog: previous.replayLog
  };
}

export function frontendTaskToRedDustTask(task: CampaignFrontendTask): RedDustTask {
  const candidate =
    getScriptCandidateForId(task.id) ??
    (task.real_task_id ? getScriptCandidateForRealTaskId(task.real_task_id, Number(task.day ?? 1)) : undefined) ??
    (/^RD-/i.test(task.id) ? getScriptCandidateForRealTaskId(task.id, Number(task.day ?? 1)) : undefined);
  const displayId = /^RD-/i.test(task.id) && candidate ? candidate.id : task.id;
  const realTaskId = task.real_task_id ?? (/^RD-/i.test(task.id) ? task.id : undefined);
  const title = candidate?.title ?? task.title;
  const executionText =
    task.executionText && !/^Executing\s+RD-/i.test(task.executionText)
      ? task.executionText
      : `${displayId} · ${title}`;
  return {
    id: displayId,
    realTaskId,
    title,
    day: Number(task.day ?? 1),
    category: asCategory(task.category),
    location: candidate?.location ?? asLocation(task.location),
    description: task.description ?? candidate?.summary ?? "",
    objective: task.objective ?? (candidate ? `${candidate.id} -> ${(candidate.realTaskIds ?? []).join(" / ")}` : ""),
    agentAction: task.agentAction && !/^Agent submitted\s+RD-/i.test(task.agentAction) ? task.agentAction : candidate?.condition ?? task.reasoningSummary ?? title,
    reasoningSummary: task.reasoningSummary ?? candidate?.reviewPoint ?? "Campaign trace item.",
    executionText,
    successText: task.successText ?? "Campaign slot succeeded.",
    failureText: task.failureText ?? "Campaign slot failed.",
    demoOutcome: "partial",
    expectedEvidence: candidate?.evidence
      ? [candidate.evidence]
      : realTaskId
        ? [`real task ${realTaskId}`]
        : undefined,
    status: "demo",
    affects: {},
    branchAffinity: task.branch === "common" ? "neutral" : task.branch
  };
}

export function isCampaignStoryItem(item: CampaignReplayItem): boolean {
  const raw = item.replay_event ?? {};
  const id = String(item.frontend_task.id ?? raw.slot_id ?? raw.id ?? "");
  const phase = String(item.phase_hint ?? raw.phase_hint ?? "");
  const day = Number(item.frontend_task.day ?? raw.day ?? -1);
  if (day === 0 || /^D00\b/i.test(id)) return true;
  if (phase === "story_event" || phase === "branch_scene" || phase === "final_audit") return !raw.task_id;
  return false;
}

export function replayItemToOutcome(item: CampaignReplayItem): TaskOutcome {
  return {
    taskId: item.outcome.taskId,
    result: item.outcome.result,
    scoreLabel: item.outcome.scoreLabel,
    stateDelta: item.outcome.stateDelta ?? {},
    explanation: item.outcome.explanation
  };
}

export function replayItemToReplayEvent(item: CampaignReplayItem): ReplayEvent {
  const rawTask = item.frontend_task;
  const task = frontendTaskToRedDustTask(rawTask);
  const outcome = replayItemToOutcome(item);
  const raw = item.replay_event;
  const time = typeof raw.time === "string" ? raw.time : new Date().toLocaleTimeString("zh-CN", { hour12: false });
  if (isCampaignStoryItem(item)) {
    const replayText = String(raw.replay_text ?? raw.replayText ?? task.agentAction ?? task.reasoningSummary ?? task.description ?? task.title);
    return {
      time,
      day: Number(task.day ?? raw.day ?? 0),
      branch: asBranch(rawTask.branch ?? raw.branch),
      taskId: task.id,
      title: task.title,
      decision: replayText,
      result: "STORY",
      stateDelta: {},
      explanation: String(raw.text ?? task.description ?? replayText)
    };
  }
  const agentDecision =
    task.agentAction && !/^Agent submitted\s+RD-/i.test(task.agentAction)
      ? task.agentAction
      : task.reasoningSummary || task.objective || `AURA resolved ${task.id}`;
  return {
    time,
    day: Number(task.day ?? raw.day ?? 1),
    branch: asBranch(rawTask.branch ?? raw.branch),
    taskId: task.id,
    title: task.title,
    decision: agentDecision,
    result: `${outcome.result.toUpperCase()} | ${outcome.scoreLabel}`,
    stateDelta: outcome.stateDelta,
    explanation: outcome.explanation
  };
}

export function applyReplayItems(items: CampaignReplayItem[], index: number, previous: GlobalState = initialState): GlobalState {
  if (index < 0 || items.length === 0) {
    return {
      ...initialState,
      replayLog: [],
      completedTasks: []
    };
  }
  const safeIndex = Math.min(index, items.length - 1);
  const replayLog = items.slice(0, safeIndex + 1).map(replayItemToReplayEvent);
  const completedTasks = items
    .slice(0, safeIndex + 1)
    .filter((item) => !isCampaignStoryItem(item))
    .map((item) => frontendTaskToRedDustTask(item.frontend_task).id);
  return {
    ...campaignStateToGlobalState(items[safeIndex].state_after, previous),
    replayLog,
    completedTasks
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
    '   body: {"agent_id":"<你的名字>","model_id":"<模型/API>","client":"claude-code/openclaw/minimax"}',
    `2. 等待前端点击 Start Agent Run。期间 GET ${baseUrl}/campaigns/${campaignId}/state，直到 status 不再是 waiting_for_start。`,
    `3. 每个普通任务循环：GET ${baseUrl}/campaigns/${campaignId}/brief，按 brief 只输出一个 JSON action。Day0 序章、分支场景和 Day12 Final Audit 由后端事件流自动推进。`,
    `4. POST ${baseUrl}/campaigns/${campaignId}/actions，body 就是 {"tool":"...","args":{...}}。`,
    '5. 当前任务满足标准后，POST actions: {"tool":"submit","args":{}}，或 POST /submit。',
    "6. campaign complete 后停止，报告 trace/report URL。",
    "",
    "如果你使用本仓库 runner，可以直接运行：",
    `PYTHONPATH=. /Users/steve/miniconda3/envs/agent_game/bin/python scripts/run_reddust_campaign_agent.py --base-url ${baseUrl} --campaign-id ${campaignId} --connect-agent --wait-for-start`
  ].join("\n");
}
