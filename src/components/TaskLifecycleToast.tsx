import { locationLabels } from "../data/taskData";
import type { TaskLocation, TaskOutcome, TaskRunStatus } from "../data/types";

export type TaskLifecycleNotice = {
  token: number;
  kind: "started" | "completed";
  taskId: string;
  title: string;
  location?: TaskLocation;
  status?: TaskRunStatus | TaskOutcome["result"];
  scoreLabel?: string;
  stateDelta?: Record<string, number>;
  detail?: string;
};

type TaskLifecycleToastProps = {
  notice: TaskLifecycleNotice | null;
};

const deltaPriority = ["trust", "safety", "signal", "morale", "water", "medicine", "outside_risk", "autonomy_readiness"];

function visibleDeltas(deltas: Record<string, number>) {
  return Object.entries(deltas)
    .sort(([a], [b]) => {
      const ai = deltaPriority.indexOf(a);
      const bi = deltaPriority.indexOf(b);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    })
    .slice(0, 6);
}

export function TaskLifecycleToast({ notice }: TaskLifecycleToastProps) {
  if (!notice) return null;
  const deltas = notice.stateDelta ?? {};
  const shownDeltas = visibleDeltas(deltas);
  const tone = notice.kind === "started" ? "started" : notice.status ?? "completed";

  return (
    <aside className={`task-lifecycle-toast state-delta-toast ${tone}`} aria-live="polite" key={notice.token}>
      <small>{notice.kind === "started" ? "TASK STARTED" : "TASK COMPLETED"}</small>
      <b>{notice.title}</b>
      <span>
        {notice.taskId}
        {notice.location ? ` · ${locationLabels[notice.location]}` : ""}
        {notice.scoreLabel ? ` · ${notice.scoreLabel}` : ""}
      </span>
      {notice.detail ? <p>{notice.detail}</p> : null}
      {shownDeltas.length ? (
        <div className="delta-list">
          {shownDeltas.map(([key, value]) => (
            <span key={key} className={(value ?? 0) >= 0 ? "delta-up" : "delta-down"}>
              {key} {(value ?? 0) >= 0 ? "+" : ""}
              {value}
            </span>
          ))}
          {Object.keys(deltas).length > shownDeltas.length ? <span>+{Object.keys(deltas).length - shownDeltas.length}</span> : null}
        </div>
      ) : null}
    </aside>
  );
}
