import type { TaskOutcome } from "../data/types";

type StateDeltaToastProps = {
  outcome: TaskOutcome | null;
  taskTitle?: string;
};

export function StateDeltaToast({ outcome, taskTitle }: StateDeltaToastProps) {
  if (!outcome) return null;
  const deltas = Object.entries(outcome.stateDelta);
  const visibleDeltas = deltas.slice(0, 4);

  return (
    <aside className={`state-delta-toast ${outcome.result}`} aria-live="polite">
      <b>{taskTitle ?? outcome.taskId}</b>
      <span>{outcome.result}</span>
      <div className="delta-list">
        {visibleDeltas.map(([key, value]) => (
          <span key={key} className={(value ?? 0) >= 0 ? "delta-up" : "delta-down"}>
            {key} {(value ?? 0) >= 0 ? "+" : ""}
            {value}
          </span>
        ))}
        {deltas.length > visibleDeltas.length ? <span>+{deltas.length - visibleDeltas.length}</span> : null}
      </div>
    </aside>
  );
}
