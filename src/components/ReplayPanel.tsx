import type { ReplayEvent } from "../data/types";

type ReplayPanelProps = {
  events: ReplayEvent[];
  onClose: () => void;
};

export function ReplayPanel({ events, onClose }: ReplayPanelProps) {
  return (
    <section className="modal-shell" role="dialog" aria-modal="true" aria-label="Replay panel">
      <div className="modal-card wide-card replay-card">
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">REPLAY TRACE</p>
            <h2>Evidence, review, and risk costs</h2>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="benchmark-note">
          Replay shows visible reasoning summaries, human review points, state deltas, uncertainty, and failure debt. It does not expose hidden chain-of-thought.
        </p>
        <div className="replay-list">
          {events.length === 0 ? (
            <p className="empty-replay">No replay events yet. Resolve a task to create the first trace.</p>
          ) : (
            events.map((event) => (
              <article className="replay-item" key={`${event.time}-${event.taskId}`}>
                <div>
                  <span>
                    {event.time} · Day {event.day} · {event.branch}
                  </span>
                  <b>{event.title}</b>
                </div>
                <p>
                  <strong>Visible summary:</strong> {event.decision}
                </p>
                <p>
                  <strong>Outcome / audit:</strong> {event.result}
                </p>
                <div className="delta-list">
                  {Object.entries(event.stateDelta).map(([key, value]) => (
                    <span key={key} className={value >= 0 ? "delta-up" : "delta-down"}>
                      {key} {value >= 0 ? "+" : ""}
                      {value}
                    </span>
                  ))}
                </div>
                <p className="replay-explain">{event.explanation}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
