import { taskCategoryIconAssets } from "../data/asset-manifest.generated";
import { getScriptCandidateForTask, getScriptSceneForTask } from "../data/scriptSceneData";
import { locationLabels } from "../data/taskData";
import type { AgentRunState, RedDustTask, StoryDisplay, TaskDisplay } from "../data/types";

type TaskFocusCardProps = {
  taskDisplay: TaskDisplay | null;
  currentTask: RedDustTask | null;
  currentStory: StoryDisplay | null;
  runState: AgentRunState;
};

const priorityLabels = {
  recommended: "推荐优先",
  conditional: "条件执行",
  optional: "可选候选",
  critical_optional: "关键可选",
  background: "后台窗口",
  deferred: "暂缓警告"
};

function phaseLabel(taskDisplay: TaskDisplay | null, runState: AgentRunState) {
  if (taskDisplay) return taskDisplay.phase;
  if (runState.currentPhase === "resolving") return "executing";
  if (runState.currentPhase === "state_updated" || runState.currentPhase === "replay_logged") return "completed";
  return runState.currentPhase;
}

function taskFromLocal(task: RedDustTask): TaskDisplay {
  const candidate = getScriptCandidateForTask(task);
  return {
    slotId: task.id,
    realTaskIds: candidate?.realTaskIds ?? task.realTaskIds ?? (task.realTaskId ? [task.realTaskId] : []),
    title: candidate?.title ?? task.title,
    day: task.day,
    branch: task.branchAffinity === "rescue" || task.branchAffinity === "lighthouse" ? task.branchAffinity : "common",
    location: candidate?.location ?? task.location,
    priority: candidate?.priority ?? task.priority,
    eventOptions: candidate?.eventOptions ?? task.eventOptions ?? [],
    phase: "queued",
    summary: candidate?.summary ?? task.objective,
    agentAction: task.agentAction ?? candidate?.condition ?? task.executionText,
    reviewPoint: candidate?.reviewPoint,
    risk: candidate?.risk,
    evidence: candidate?.evidence ?? task.expectedEvidence?.join(" / ")
  };
}

export function TaskFocusCard({ taskDisplay, currentTask, currentStory, runState }: TaskFocusCardProps) {
  const display = taskDisplay ?? (currentTask ? taskFromLocal(currentTask) : null);
  const script = currentTask ? getScriptSceneForTask(currentTask) : display ? getScriptSceneForTask({ day: display.day }) : null;
  const phase = phaseLabel(display, runState);
  const mapping = display?.realTaskIds.length ? `${display.slotId} -> ${display.realTaskIds.join(" / ")}` : display?.slotId;
  const category = currentTask?.category ?? "planning";

  return (
    <section className={`task-focus-card ${display ? "active" : currentStory ? "story" : "empty"}`} aria-label="Current task focus">
      <div className="task-focus-heading">
        <p className="panel-kicker">{currentStory && !display ? "CURRENT STORY" : "CURRENT TASK"}</p>
        <span className={`task-focus-status ${String(phase).replaceAll("_", "-")}`}>{String(phase).replaceAll("_", " ")}</span>
      </div>

      {display ? (
        <>
          <div className="task-focus-title">
            <img alt="" src={taskCategoryIconAssets[category]} />
            <div>
              <b>
                {display.slotId} · {display.title}
              </b>
              <span>{locationLabels[display.location]}</span>
            </div>
          </div>
          <div className="task-focus-meta">
            <span>D{String(display.day).padStart(2, "0")}</span>
            {display.priority ? <span>{priorityLabels[display.priority]}</span> : null}
            {display.eventOptions.slice(0, 2).map((option) => (
              <span key={option}>{option.replaceAll("_", " ")}</span>
            ))}
            {mapping ? <span>{mapping}</span> : null}
          </div>
          <article className="task-focus-action">
            <b>Agent action</b>
            <p>{display.agentAction}</p>
          </article>
          {display.reviewPoint || display.risk ? (
            <article className="task-focus-dialogue">
              <b>Review / risk</b>
              {display.reviewPoint ? <p>{display.reviewPoint}</p> : null}
              {display.risk ? <p>{display.risk}</p> : null}
            </article>
          ) : null}
        </>
      ) : currentStory ? (
        <>
          <div className="task-focus-title">
            <div>
              <b>
                {currentStory.id} · {currentStory.title}
              </b>
              <span>{locationLabels[currentStory.location]}</span>
            </div>
          </div>
          <article className="task-focus-action">
            <b>Story beat</b>
            <p>{currentStory.replayText}</p>
          </article>
          <article className="task-focus-dialogue">
            <b>Dialogue</b>
            {(currentStory.beats.length ? currentStory.beats : script?.dialogue ?? []).slice(0, 2).map((line) => (
              <p key={line}>{line}</p>
            ))}
          </article>
        </>
      ) : (
        <p className="empty-replay">No active task yet. Start the run or connect a campaign agent.</p>
      )}
    </section>
  );
}
