import type { RedDustTask, TaskOutcome } from "../../data/types";

const lowerIsBetterMetrics = new Set([
  "outside_risk",
  "medical_pressure",
  "dissatisfaction",
  "maintenance_debt",
  "false_signal_risk",
  "aura_authority_risk",
  "sacrifice_list_risk",
  "branch_tension",
  "privacy_risk"
]);

function scaleDelta(key: string, value: number, result: TaskOutcome["result"]) {
  if (result === "success") return value;
  if (result === "partial") return Math.trunc(value * 0.5);
  if (lowerIsBetterMetrics.has(key) && value < 0) {
    const penalty = Math.max(1, Math.ceil(Math.abs(value) / 3));
    return result === "missing" ? 1 : penalty;
  }
  if (result === "missing") return value > 0 ? -1 : Math.min(-1, value);
  if (value > 0) return -Math.max(1, Math.ceil(value / 3));
  return value;
}

export function resolveTaskOutcome(task: RedDustTask): TaskOutcome {
  let result: TaskOutcome["result"] = task.demoOutcome;
  let scoreLabel = "demo outcome";

  if (task.status === "missing") {
    result = "missing";
    scoreLabel = "missing task";
  } else if (task.openclawScore !== undefined) {
    scoreLabel = `OpenClaw ${task.openclawScore}`;
    if (task.openclawScore >= 90) result = "success";
    else if (task.openclawScore >= 60) result = "partial";
    else result = "failed";
  }

  const stateDelta = Object.fromEntries(
    Object.entries(task.affects).map(([key, value]) => [key, scaleDelta(key, value ?? 0, result)])
  ) as TaskOutcome["stateDelta"];

  const explanation =
    result === "success"
      ? task.successText
      : result === "partial"
        ? `${task.successText} Some evidence remains low-confidence.`
        : result === "missing"
          ? "The baseline marked this item as missing, so AURA logs a small trust and morale penalty."
          : task.failureText;

  return {
    taskId: task.id,
    result,
    scoreLabel,
    stateDelta,
    explanation
  };
}
