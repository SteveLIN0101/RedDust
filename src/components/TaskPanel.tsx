import { locationLabels } from "../data/taskData";
import { getScriptCandidateForTask } from "../data/scriptSceneData";
import type { RedDustTask } from "../data/types";

type TaskPanelProps = {
  task: RedDustTask | null;
  onResolve: (task: RedDustTask) => void;
  onSkip: () => void;
};

export function TaskPanel({ task, onResolve, onSkip }: TaskPanelProps) {
  if (!task) {
    return (
      <section className="panel task-panel empty-panel">
        <p className="panel-kicker">AREA INSPECTOR</p>
        <h2>AURA Agent Console</h2>
        <p>手动点击区域只会查看该区域任务详情和历史记录；主流程由 AURA 自动推进。</p>
      </section>
    );
  }
  const candidate = getScriptCandidateForTask(task);
  const mapping = candidate?.realTaskIds?.length
    ? `${task.id} -> ${candidate.realTaskIds.join(" / ")}`
    : task.realTaskId
      ? `${task.id} -> ${task.realTaskId}`
      : task.id;

  return (
    <section className="panel task-panel">
      <p className="panel-kicker">AREA INSPECTOR</p>
      <div className="task-title-row">
        <span>{task.id}</span>
        <em className={`status ${task.status}`}>{task.status}</em>
      </div>
      <h2>{task.title}</h2>
      <p className="metadata-line">Story slot / benchmark mapping: {mapping}</p>
      <dl className="task-meta">
        <div>
          <dt>Day</dt>
          <dd>{task.day}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{task.category}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{locationLabels[task.location]}</dd>
        </div>
        <div>
          <dt>Benchmark</dt>
          <dd>{candidate?.realTaskIds?.[0] ?? task.realTaskId ?? "demo"}</dd>
        </div>
      </dl>
      <article className="copy-block">
        <b>Description</b>
        <p>{task.description}</p>
      </article>
      <article className="copy-block">
        <b>Objective</b>
        <p>{task.objective}</p>
      </article>
      <article className="copy-block">
        <b>Agent Action</b>
        <p>{task.agentAction}</p>
      </article>
      <article className="copy-block">
        <b>Visible Review Summary</b>
        <p>{task.reasoningSummary}</p>
      </article>
      <div className="evidence-row">
        {(task.expectedEvidence ?? ["demo evidence"]).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="delta-list" aria-label="State impact">
        {Object.entries(task.affects)
          .filter((entry): entry is [string, number] => entry[1] !== undefined)
          .map(([key, value]) => (
            <span key={key} className={value >= 0 ? "delta-up" : "delta-down"}>
              {key} {value >= 0 ? "+" : ""}
              {value}
            </span>
          ))}
      </div>
      <details className="developer-controls">
        <summary>Developer Controls</summary>
        <div className="task-actions">
          <button onClick={() => onResolve(task)}>Resolve Task</button>
          <button className="ghost" onClick={onSkip}>
            Close Inspector
          </button>
        </div>
      </details>
    </section>
  );
}
