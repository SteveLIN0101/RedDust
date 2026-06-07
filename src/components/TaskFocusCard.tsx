import { taskCategoryIconAssets } from "../data/asset-manifest.generated";
import { getScriptCandidateForTask, getScriptSceneForTask } from "../data/scriptSceneData";
import { locationLabels } from "../data/taskData";
import type { AgentRunState, RedDustTask, StoryDisplay, TaskRunStatus } from "../data/types";
import type { AgentTraceEntry } from "./AgentTracePanel";

type TaskFocusCardProps = {
  currentTask: RedDustTask | null;
  currentStory: StoryDisplay | null;
  selectedTask: RedDustTask | null;
  runState: AgentRunState;
  entries: AgentTraceEntry[];
};

const priorityLabels = {
  recommended: "推荐优先",
  conditional: "条件执行",
  optional: "可选候选",
  critical_optional: "关键可选",
  background: "后台窗口",
  deferred: "暂缓警告"
};

const statusLabels: Record<string, string> = {
  locked: "Locked",
  queued: "Queued",
  thinking: "Thinking",
  moving: "Moving",
  executing: "Executing",
  resolving: "Resolving",
  state_updated: "State Updated",
  replay_logged: "Replay Logged",
  success: "Success",
  partial: "Partial",
  failed: "Failed",
  missing: "Missing",
  skipped: "Skipped",
  idle: "Idle",
  day_summary: "Day Summary",
  branch_decision: "Route Fork",
  ending: "Ending",
  story_event: "Story",
  branch_scene: "Branch Scene",
  final_audit: "Final Audit"
};

function latestActionForTask(entries: AgentTraceEntry[], task: RedDustTask | null) {
  const relevant = [...entries].reverse().find((entry) => {
    if (entry.type !== "action_executed") return false;
    if (!task) return true;
    return entry.slotId === task.id || entry.taskId === task.realTaskId || entry.taskId === task.id;
  });
  if (!relevant) return null;
  return `${relevant.title}: ${relevant.detail}`;
}

function taskStatus(task: RedDustTask, runState: AgentRunState) {
  const stored = runState.taskStatuses[task.id];
  const active = runState.currentTaskId === task.id;
  if (active && runState.currentPhase !== "idle") return runState.currentPhase;
  return stored ?? "queued";
}

export function TaskFocusCard({ currentTask, currentStory, selectedTask, runState, entries }: TaskFocusCardProps) {
  const task = currentTask ?? selectedTask;
  const candidate = task ? getScriptCandidateForTask(task) : null;
  const script = task ? getScriptSceneForTask(task) : null;
  const action = task ? latestActionForTask(entries, task) ?? task.agentAction ?? candidate?.condition ?? script?.action : null;
  const dialogue = currentStory ? currentStory.beats.slice(0, 2) : script?.dialogue.slice(0, 2) ?? [];
  const status = task ? taskStatus(task, runState) : currentStory ? currentStory.eventType : runState.currentPhase;
  const mapping = candidate?.realTaskIds?.length
    ? `${task?.id ?? candidate.id} -> ${candidate.realTaskIds.join(" / ")}`
    : task?.realTaskId
      ? `${task.id} -> ${task.realTaskId}`
      : task?.id;

  return (
    <section className={`task-focus-card ${task ? "active" : currentStory ? "story" : "empty"}`} aria-label="Current task focus">
      <div className="task-focus-heading">
        <p className="panel-kicker">{currentStory ? "CURRENT STORY" : "CURRENT TASK"}</p>
        <span className={`task-focus-status ${String(status).replace("_", "-")}`}>
          {statusLabels[status as keyof typeof statusLabels] ?? String(status).replace("_", " ")}
        </span>
      </div>

      {task ? (
        <>
          <div className="task-focus-title">
            <img alt="" src={taskCategoryIconAssets[task.category]} />
            <div>
              <b>{task.id} · {task.title}</b>
              <span>{locationLabels[task.location]}</span>
            </div>
          </div>
          <div className="task-focus-meta">
            <span>D{String(task.day).padStart(2, "0")}</span>
            {candidate ? <span>{priorityLabels[candidate.priority]}</span> : null}
            {mapping ? <span>{mapping}</span> : null}
          </div>
          <article className="task-focus-action">
            <b>Agent action</b>
            <p>{action}</p>
          </article>
          {dialogue.length ? (
            <article className="task-focus-dialogue">
              <b>Dialogue</b>
              {dialogue.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>
          ) : null}
        </>
      ) : currentStory ? (
        <>
          <div className="task-focus-title">
            <div>
              <b>{currentStory.id} · {currentStory.title}</b>
              <span>{locationLabels[currentStory.location]}</span>
            </div>
          </div>
          <article className="task-focus-action">
            <b>Story beat</b>
            <p>{currentStory.replayText}</p>
          </article>
          {dialogue.length ? (
            <article className="task-focus-dialogue">
              <b>Dialogue</b>
              {dialogue.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </article>
          ) : null}
        </>
      ) : (
        <p className="empty-replay">No active task yet. Start the run or connect a campaign agent.</p>
      )}
    </section>
  );
}
