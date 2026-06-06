import { taskCategoryIconAssets } from "../data/asset-manifest.generated";
import { dayPlansByDay } from "../data/dayPlanData";
import { image2Assets } from "../data/image2Assets";
import { getDayScriptScene, getScriptSceneForTask } from "../data/scriptSceneData";
import { baselineHints, locationLabels } from "../data/taskData";
import type { AgentRunState, RedDustTask, StoryDisplay, TaskLocation } from "../data/types";

type AgentConsolePanelProps = {
  runState: AgentRunState;
  currentTask: RedDustTask | null;
  currentStory: StoryDisplay | null;
  selectedLocation: TaskLocation | null;
  selectedTask: RedDustTask | null;
};

export function AgentConsolePanel({
  runState,
  currentTask,
  currentStory,
  selectedLocation,
  selectedTask
}: AgentConsolePanelProps) {
  const task = currentStory ? null : selectedTask ?? currentTask;
  const dayPlan = dayPlansByDay[runState.currentDay];
  const scriptCopy = currentStory ? null : task ? getScriptSceneForTask(task) : getDayScriptScene(runState.currentDay);

  return (
    <section className="panel agent-console-panel">
      <div className="console-identity">
        <img alt="" src={image2Assets.auraIdle.uiPath} />
        <div>
          <p className="panel-kicker">AURA AGENT CONSOLE</p>
          <b>Autonomous benchmark runner</b>
        </div>
      </div>
      <div className="console-status-grid">
        <div>
          <span>Current Phase</span>
          <b>{runState.currentPhase.replace("_", " ")}</b>
        </div>
        <div>
          <span>Run Mode</span>
          <b>{runState.runMode.replace("_", " ")}</b>
        </div>
        <div>
          <span>Day Plan</span>
          <b>{dayPlan?.title ?? "No plan"}</b>
        </div>
        <div>
          <span>Branch</span>
          <b>{runState.activeBranch}</b>
        </div>
      </div>

      <article className="copy-block">
        <b>Current Story Beat</b>
        <p className="task-copy-with-icon">
          {!currentStory && currentTask ? <img alt="" src={taskCategoryIconAssets[currentTask.category]} /> : null}
          {currentStory
            ? `${currentStory.id} · ${currentStory.title}`
            : currentTask
              ? `${currentTask.id} · ${currentTask.title}`
              : `${dayPlan?.title ?? "No active day"} · waiting for replay`}
        </p>
        <small className="metadata-line">Canon source: {currentStory?.source ?? scriptCopy?.source}</small>
      </article>

      {currentStory ? (
        <article className="copy-block story-detail-card">
          <p>{currentStory.text}</p>
          <div className="story-beat-list">
            {currentStory.beats.slice(0, 4).map((beat) => (
              <span key={beat}>{beat}</span>
            ))}
          </div>
          <div className="story-marker-row">
            {[...currentStory.flags, ...currentStory.unlocks].slice(0, 5).map((marker) => (
              <span key={marker}>{marker}</span>
            ))}
          </div>
        </article>
      ) : null}

      {!currentStory && currentTask?.realTaskId ? <small className="metadata-line">Benchmark: {currentTask.realTaskId}</small> : null}
      {!currentStory && currentTask ? <small className="metadata-line compact-reference">{baselineHints[currentTask.category]}.</small> : null}

      {selectedLocation ? (
        <article className="zone-history">
          <b>Selected Area</b>
          <p>{locationLabels[selectedLocation]}</p>
          <p>{task ? `${task.id}: ${task.title}` : "No task currently attached to this area."}</p>
        </article>
      ) : null}

    </section>
  );
}
