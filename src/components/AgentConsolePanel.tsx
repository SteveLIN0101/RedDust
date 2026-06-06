import { taskCategoryIconAssets } from "../data/asset-manifest.generated";
import { dayPlansByDay } from "../data/dayPlanData";
import { image2Assets } from "../data/image2Assets";
import { getDayScriptCandidates, getDayScriptScene, getScriptCandidateForTask, getScriptSceneForTask } from "../data/scriptSceneData";
import { baselineHints, locationLabels } from "../data/taskData";
import type { AgentRunState, GlobalState, RedDustTask, StoryDisplay, TaskLocation } from "../data/types";

type AgentConsolePanelProps = {
  runState: AgentRunState;
  state: GlobalState;
  currentTask: RedDustTask | null;
  currentStory: StoryDisplay | null;
  selectedLocation: TaskLocation | null;
  selectedTask: RedDustTask | null;
};

const priorityLabels = {
  recommended: "推荐优先",
  conditional: "条件执行",
  optional: "可选候选"
};

function formatStateMetric(state: GlobalState, key: string, fallback?: string, unit?: string) {
  const value = state[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return unit ? `${value}${unit}` : `${value}/100`;
  }
  if (typeof value === "string" && value.trim()) return value;
  return fallback ?? "pending";
}

export function AgentConsolePanel({
  runState,
  state,
  currentTask,
  currentStory,
  selectedLocation,
  selectedTask
}: AgentConsolePanelProps) {
  const task = currentStory ? null : selectedTask ?? currentTask;
  const activeDay = currentStory?.day ?? task?.day ?? runState.currentDay;
  const dayPlan = dayPlansByDay[activeDay];
  const dayScript = getDayScriptScene(activeDay);
  const scriptCopy = currentStory ? dayScript : task ? getScriptSceneForTask(task) : dayScript;
  const dayCandidates = getDayScriptCandidates(activeDay);
  const activeCandidate = task ? getScriptCandidateForTask(task) : null;
  const showScriptDashboard = activeDay <= 6 && (dayCandidates.length > 0 || Boolean(dayScript.statusMetrics?.length));
  const metricReadouts = (dayScript.statusMetrics ?? []).slice(0, 6);
  const evidencePanels = (dayScript.evidencePanels ?? []).slice(0, 4);
  const identityLabel =
    activeDay === 0
      ? "AURA PROLOGUE CONSOLE"
      : showScriptDashboard
        ? `AURA DAY${activeDay} REVIEW CONSOLE`
        : "AURA AGENT CONSOLE";
  const identityCopy =
    activeDay === 0
      ? "Prologue, replay start, limited authority"
      : showScriptDashboard
        ? "Candidate slots, human review, risk cost"
        : "Autonomous benchmark runner";
  const visibleReviewBrief = dayScript.reasoningSummary?.slice(0, 3).join(" · ") ?? dayScript.narrativePurpose;
  const mappingLine = activeCandidate?.realTaskIds?.length
    ? `${task?.id ?? activeCandidate.id} -> ${activeCandidate.realTaskIds.join(" / ")}`
    : task?.realTaskId
      ? `${task.id} -> ${task.realTaskId}`
      : task
        ? task.id
        : "";

  return (
    <section className={`panel agent-console-panel ${showScriptDashboard ? "script-dashboard-panel" : ""}`}>
      <div className="console-identity">
        <img alt="" src={image2Assets.auraIdle.uiPath} />
        <div>
          <p className="panel-kicker">{identityLabel}</p>
          <b>{identityCopy}</b>
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

      {!showScriptDashboard ? <article className="copy-block">
        <b>Current Story Beat</b>
        <p className="task-copy-with-icon">
          {!currentStory && currentTask ? <img alt="" src={taskCategoryIconAssets[currentTask.category]} /> : null}
          {currentStory
            ? `${currentStory.id} · ${currentStory.title}`
            : currentTask
              ? `${currentTask.id} · ${currentTask.title}`
              : `${dayPlan?.title ?? "No active day"} · waiting for replay`}
        </p>
        <small className="metadata-line">Canon source: {currentStory?.source ?? scriptCopy.source}</small>
      </article> : null}

      {showScriptDashboard ? (
        <>
          {metricReadouts.length ? (
            <div className="story-state-row" aria-label={`Day ${activeDay} state readouts`}>
              {metricReadouts.map((metric) => (
                <span key={metric.key} title={metric.help}>
                  <b>{metric.label}</b>
                  {formatStateMetric(state, metric.key, metric.fallback, metric.unit)}
                </span>
              ))}
            </div>
          ) : null}
          <p className="day-one-summary-line" title={dayScript.narrativePurpose}>
            {visibleReviewBrief}
          </p>
          {dayCandidates.length ? (
            <article className="copy-block candidate-queue">
              <b>Candidate Slots</b>
              <div className="candidate-list">
                {dayCandidates.map((candidate) => (
                  <div className={`candidate-card ${candidate.priority}`} key={candidate.id} title={`${candidate.condition} · ${candidate.risk}`}>
                    <span>{priorityLabels[candidate.priority]}</span>
                    <b>{candidate.id}</b>
                    <p>{candidate.title}</p>
                    <small>{candidate.realTaskIds?.slice(0, 2).join(" / ")}</small>
                  </div>
                ))}
              </div>
            </article>
          ) : null}
          {evidencePanels.length ? (
            <div className="evidence-panel-grid" aria-label={`Day ${activeDay} evidence panels`}>
              {evidencePanels.map((panel) => (
                <article className={`evidence-panel ${panel.tone}`} key={panel.title}>
                  <b>{panel.title}</b>
                  <p>{panel.body}</p>
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {showScriptDashboard ? <article className="copy-block current-story-compact">
        <b>Current Story Beat</b>
        <p className="task-copy-with-icon">
          {!currentStory && currentTask ? <img alt="" src={taskCategoryIconAssets[currentTask.category]} /> : null}
          {currentStory
            ? `${currentStory.id} · ${currentStory.title}`
            : currentTask
              ? `${currentTask.id} · ${currentTask.title}`
              : `${dayPlan?.title ?? "No active day"} · waiting for replay`}
        </p>
        <small className="metadata-line">Canon source: {currentStory?.source ?? scriptCopy.source}</small>
        {mappingLine ? <small className="metadata-line">Mapping: {mappingLine}</small> : null}
      </article> : null}

      {activeCandidate ? (
        <article className={`copy-block candidate-detail-card ${activeCandidate.priority}`}>
          <b>{priorityLabels[activeCandidate.priority]} · {activeCandidate.title}</b>
          <p>{activeCandidate.summary}</p>
          <small className="metadata-line">{activeCandidate.reviewPoint}</small>
          <small className="metadata-line">{activeCandidate.condition}</small>
        </article>
      ) : null}

      {currentStory || (activeDay === 0 && !task) ? (
        <article className="copy-block story-detail-card">
          <p>{currentStory?.text ?? dayScript.scene}</p>
          <div className="story-beat-list">
            {(currentStory?.beats ?? dayScript.beats ?? [dayScript.action]).slice(0, 4).map((beat) => (
              <span key={beat}>{beat}</span>
            ))}
          </div>
          <div className="story-marker-row">
            {[...(currentStory?.flags ?? dayScript.flags ?? []), ...(currentStory?.unlocks ?? dayScript.unlocks ?? [])].slice(0, 5).map((marker) => (
              <span key={marker}>{marker}</span>
            ))}
          </div>
        </article>
      ) : null}

      {showScriptDashboard && dayScript.reasoningSummary?.length ? (
        <article className="copy-block reasoning-card">
          <b>Visible Review Notes</b>
          <div className="reasoning-list">
            {dayScript.reasoningSummary.slice(0, 6).map((item) => (
              <span key={item}>{item}</span>
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
