import { generatedAssetByName } from "../data/asset-manifest.generated";
import type { ReplayEvent } from "../data/types";
import { summarizeReplayLine } from "../game/systems/replayEngine";

type LiveReplayFeedProps = {
  events: ReplayEvent[];
};

export function LiveReplayFeed({ events }: LiveReplayFeedProps) {
  const recent = events.slice(-2).reverse();

  return (
    <section className="live-replay-feed">
      <div className="feed-heading">
        <img alt="" src={generatedAssetByName["replay-feed-icon"].uiPath} />
        <p className="panel-kicker">LIVE REPLAY FEED</p>
      </div>
      {recent.length === 0 ? (
        <p className="empty-replay">Replay will append automatically after the first resolved task.</p>
      ) : (
        <div className="feed-list">
          {recent.map((event) => (
            <div className="feed-item" key={`${event.time}-${event.taskId}-${event.branch}`}>
              <img alt="" src={generatedAssetByName["replay-feed-icon"].uiPath} />
              {summarizeReplayLine(event)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
