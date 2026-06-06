import type { CampaignEvent } from "../data/campaignClient";
import { getScriptCandidateForTask, getScriptSceneForTask } from "../data/scriptSceneData";
import type { RedDustTask, StoryDisplay } from "../data/types";

export type AgentTraceEntry = {
  id: string;
  at: string;
  type: CampaignEvent["type"];
  slotId?: string;
  taskId?: string;
  title: string;
  detail: string;
  status?: "ok" | "warn" | "error";
};

const priorityLabels = {
  recommended: "推荐优先",
  conditional: "条件执行",
  optional: "可选候选",
  critical_optional: "关键可选",
  background: "后台窗口"
};

function shortJson(value: unknown) {
  if (value === undefined || value === null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
}

function summarizeObservation(value: unknown): string {
  if (Array.isArray(value)) {
    const first = value[0] as Record<string, unknown> | undefined;
    if (!first) return "no observation";
    return shortJson(first.title ?? first.text ?? first.id ?? first);
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return shortJson(obj.title ?? obj.text ?? obj.id ?? obj);
  }
  return shortJson(value);
}

export function campaignEventToAgentTraceEntry(event: CampaignEvent): AgentTraceEntry | null {
  const payload = event.payload;
  const slotId = String(payload.slot_id ?? (payload.slot as Record<string, unknown> | undefined)?.slot_id ?? "");
  const taskId = String(payload.task_id ?? (payload.run as Record<string, unknown> | undefined)?.task_id ?? "");

  if (event.type === "task_started") {
    const slot = (payload.slot ?? {}) as Record<string, unknown>;
    const run = (payload.run ?? {}) as Record<string, unknown>;
    return {
      id: `${event.seq}:task_started`,
      at: event.at,
      type: event.type,
      slotId: String(slot.slot_id ?? ""),
      taskId: String(run.task_id ?? ""),
      title: `Started ${String(slot.slot_id ?? run.task_id ?? "task")}`,
      detail: `${String(slot.story_title ?? "Campaign slot")} · ${String(run.title ?? run.task_id ?? "")}`,
      status: "ok"
    };
  }

  if (event.type === "action_executed") {
    const action = (payload.action ?? {}) as Record<string, unknown>;
    const ok = payload.ok === false ? "error" : "ok";
    return {
      id: `${event.seq}:action`,
      at: event.at,
      type: event.type,
      slotId,
      taskId,
      title: `Tool: ${String(action.tool ?? "unknown")}`,
      detail: `${shortJson(action.args)} -> ${summarizeObservation(payload.observation)}`,
      status: ok
    };
  }

  if (event.type === "task_submitted") {
    return {
      id: `${event.seq}:submit`,
      at: event.at,
      type: event.type,
      slotId,
      taskId,
      title: "Submitted for scoring",
      detail: taskId || slotId || "Campaign task submitted.",
      status: "warn"
    };
  }

  if (event.type === "slot_completed") {
    const replay = (payload.replay_event ?? {}) as Record<string, unknown>;
    const failureReasons = replay.failure_reasons;
    return {
      id: `${event.seq}:slot_completed`,
      at: event.at,
      type: event.type,
      slotId: String(replay.slot_id ?? slotId),
      taskId: String(replay.task_id ?? taskId),
      title: `${String(replay.slot_title ?? "Slot completed")} · ${String(replay.outcome ?? "")}`,
      detail: `score ${String(replay.score ?? "")}${Array.isArray(failureReasons) && failureReasons.length ? ` · ${failureReasons.join("; ")}` : ""}`,
      status: replay.outcome === "success" ? "ok" : "warn"
    };
  }

  if (event.type === "story_event" || event.type === "branch_scene" || event.type === "final_audit") {
    const story = { ...payload, ...((payload.story_event ?? {}) as Record<string, unknown>) };
    const replay = (payload.replay_event ?? {}) as Record<string, unknown>;
    return {
      id: `${event.seq}:${event.type}`,
      at: event.at,
      type: event.type,
      slotId: String(story.id ?? replay.slot_id ?? event.type),
      title: String(story.title ?? replay.slot_title ?? event.type),
      detail: String(story.text ?? replay.task_title ?? "Readable-script story beat."),
      status: "ok"
    };
  }

  if (event.type === "campaign_complete") {
    const ending = (payload.ending ?? {}) as Record<string, unknown>;
    return {
      id: `${event.seq}:complete`,
      at: event.at,
      type: event.type,
      title: String(ending.title ?? "Campaign complete"),
      detail: String(ending.text ?? "Final campaign state reached."),
      status: "ok"
    };
  }

  return null;
}

type AgentTracePanelProps = {
  entries: AgentTraceEntry[];
  currentTask: RedDustTask | null;
  currentStory: StoryDisplay | null;
};

export function AgentTracePanel({ entries, currentTask, currentStory }: AgentTracePanelProps) {
  const scopedEntries = currentTask
    ? entries.filter((entry) => entry.slotId === currentTask.id || (currentTask.realTaskId && entry.taskId === currentTask.realTaskId))
    : currentStory
      ? entries.filter((entry) => entry.slotId === currentStory.id || entry.title === currentStory.title)
    : [];
  const visibleEntries = (scopedEntries.length ? scopedEntries : entries).slice(-3).reverse();
  const candidateCopy = currentTask ? getScriptCandidateForTask(currentTask) : null;
  const fallbackPrimary = currentTask && candidateCopy
    ? {
        id: `${currentTask.id}:candidate`,
        at: "",
        type: "task_started" as CampaignEvent["type"],
        slotId: currentTask.id,
        title: `${priorityLabels[candidateCopy.priority]} · ${candidateCopy.title}`,
        detail: `${candidateCopy.reviewPoint} · 证据链：${candidateCopy.evidence} · 风险代价：${candidateCopy.risk}`,
        status: candidateCopy.priority === "recommended" ? "ok" as const : "warn" as const
      }
    : null;
  const primary = visibleEntries[0] ?? fallbackPrimary;
  const scriptCopy = currentTask ? getScriptSceneForTask(currentTask) : null;

  return (
    <section className="agent-trace-panel" aria-label="Agent action trace">
      <div className="feed-heading">
        <p className="panel-kicker">AGENT ACTION TRACE</p>
      </div>
      {currentStory ? (
        <>
          <article className="trace-script-strip story-strip">
            <b>{currentStory.id} · {currentStory.title}</b>
            <span>{currentStory.source}</span>
            <p>{currentStory.text}</p>
          </article>
          <article className="current-action ok">
            <span>{currentStory.id} · {currentStory.eventType.replace("_", " ")}</span>
            <b>{currentStory.replayText}</b>
            <p>{currentStory.beats[0] ?? currentStory.text}</p>
          </article>
          <div className="trace-list story-beat-list">
            {currentStory.beats.slice(1, 3).map((beat) => (
              <div className="trace-item ok" key={beat}>
                <span>beat</span>
                <p>{beat}</p>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {!currentStory && scriptCopy && currentTask ? (
        <article className="trace-script-strip">
          <b>{currentTask.id} · {scriptCopy.title}</b>
          <span>{scriptCopy.source}</span>
          <p>{candidateCopy ? `${candidateCopy.condition} · ${candidateCopy.risk}` : scriptCopy.scene}</p>
        </article>
      ) : null}
      {!currentStory && primary ? (
        <article className={`current-action ${primary.status ?? "ok"}`}>
          <span>{currentTask ? currentTask.id : "latest"} · {primary.type.replace("_", " ")}</span>
          <b>{primary.title}</b>
          <p>{primary.detail}</p>
        </article>
      ) : !currentStory ? (
        <p className="empty-replay">No agent tool calls yet. Replay actions will appear here.</p>
      ) : null}
      {!currentStory && visibleEntries.length > 1 ? (
        <div className="trace-list">
          {visibleEntries.slice(1, 3).map((entry) => (
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
