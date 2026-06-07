import type { AgentActionDisplay, RedDustTask, StoryDisplay, TaskDisplay } from "../data/types";

type AgentTracePanelProps = {
  entries: AgentActionDisplay[];
  currentTask: TaskDisplay | null;
  currentStory: StoryDisplay | null;
  fallbackTask: RedDustTask | null;
};

function scoped(entry: AgentActionDisplay, task: TaskDisplay | null, story: StoryDisplay | null) {
  if (task) return entry.slotId === task.slotId || task.realTaskIds.includes(entry.taskId ?? "");
  if (story) return entry.slotId === story.id || entry.title === story.title;
  return true;
}

export function AgentTracePanel({ entries, currentTask, currentStory, fallbackTask }: AgentTracePanelProps) {
  const visibleEntries = entries.filter((entry) => scoped(entry, currentTask, currentStory)).slice(-4).reverse();
  const primary = visibleEntries[0];
  const fallbackSummary = currentTask?.agentAction ?? fallbackTask?.agentAction ?? currentStory?.replayText;

  return (
    <section className="agent-trace-panel" aria-label="Agent action trace">
      <div className="feed-heading">
        <p className="panel-kicker">AGENT ACTION</p>
        <b>{currentTask ? currentTask.phase : currentStory ? currentStory.kind.replace("_", " ") : "waiting"}</b>
      </div>

      {currentStory ? (
        <article className="trace-script-strip story-strip">
          <b>{currentStory.id} · {currentStory.title}</b>
          {currentStory.source ? <span>{currentStory.source}</span> : null}
          <p>{currentStory.replayText}</p>
        </article>
      ) : null}

      {primary ? (
        <article className={`current-action ${primary.status ?? "ok"}`}>
          <span>{primary.slotId || primary.taskId || primary.type}</span>
          <b>{primary.title}</b>
          <p>{primary.summary}</p>
          {primary.safeObservationPreview ? <small>{primary.safeObservationPreview}</small> : null}
        </article>
      ) : fallbackSummary ? (
        <article className="current-action ok">
          <span>{currentTask?.slotId ?? fallbackTask?.id ?? currentStory?.id ?? "local"}</span>
          <b>{currentTask?.title ?? fallbackTask?.title ?? currentStory?.title ?? "Waiting"}</b>
          <p>{fallbackSummary}</p>
        </article>
      ) : (
        <p className="empty-replay">No agent tool calls yet. Display-safe summaries will appear here.</p>
      )}

      {visibleEntries.length > 1 ? (
        <div className="trace-list">
          {visibleEntries.slice(1, 4).map((entry) => (
            <div className={`trace-item ${entry.status ?? "ok"}`} key={entry.id}>
              <span>{entry.slotId || entry.taskId || entry.type}</span>
              <p>{entry.title}</p>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
