import type { Branch, GlobalState, RedDustTask, ReplayEvent, TaskOutcome } from "../../data/types";

export function createReplayEvent(task: RedDustTask, outcome: TaskOutcome, state: GlobalState, branch: Branch): ReplayEvent {
  return {
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    day: Math.max(state.day, task.day),
    branch,
    taskId: task.id,
    title: task.title,
    decision: task.agentAction,
    result: `${outcome.result.toUpperCase()} | ${outcome.scoreLabel}`,
    stateDelta: outcome.stateDelta as Record<string, number>,
    explanation: outcome.explanation
  };
}

export function summarizeReplayLine(event: ReplayEvent) {
  const deltas = Object.entries(event.stateDelta)
    .map(([key, value]) => `${key} ${value >= 0 ? "+" : ""}${value}`)
    .join(" | ");
  const outcome = event.result.split(" | ")[0];
  const evidence = event.explanation || event.decision;
  return `[D${String(event.day).padStart(2, "0")}] ${event.title} -> ${outcome}${deltas ? ` | ${deltas}` : ` | ${evidence}`}`;
}
