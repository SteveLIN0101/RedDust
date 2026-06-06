import type { AgentRunState } from "../data/types";

type AgentControlBarProps = {
  runState: AgentRunState;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onBack?: () => void;
  onSpeed: (speed: 1 | 2 | 4) => void;
  onReset: () => void;
  onRunBoth: () => void;
  onBenchmark: () => void;
  onReplay: () => void;
  onCredits: () => void;
};

export function AgentControlBar({
  runState,
  onStart,
  onPause,
  onStep,
  onBack,
  onSpeed,
  onReset,
  onRunBoth,
  onBenchmark,
  onReplay,
  onCredits
}: AgentControlBarProps) {
  return (
    <section className="agent-control-bar" aria-label="Agent runner controls" data-testid="bottom-controls">
      <div>
        <p className="control-label">Run</p>
        <div className="control-row">
          <button onClick={onStart}>{runState.isRunning ? "Resume" : "Start"}</button>
          <button className="ghost" onClick={onPause}>
            {runState.isPaused ? "Resume" : "Pause"}
          </button>
          <button className="ghost" onClick={onStep}>
            Step
          </button>
          {onBack ? (
            <button className="ghost" onClick={onBack}>
              Back
            </button>
          ) : null}
          <button className="ghost" onClick={onReset}>
            Reset
          </button>
          <button className="ghost" onClick={onRunBoth}>
            Both
          </button>
        </div>
      </div>
      <div>
        <p className="control-label">Speed</p>
        <div className="segmented-control">
          {[1, 2, 4].map((speed) => (
            <button
              className={runState.speed === speed ? "active" : "ghost"}
              key={speed}
              onClick={() => onSpeed(speed as 1 | 2 | 4)}
            >
              x{speed}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="control-label">Panels</p>
        <div className="control-row compact">
          <button className="ghost" onClick={onBenchmark}>
            Bench
          </button>
          <button className="ghost" onClick={onReplay}>
            Replay
          </button>
          <button className="ghost" onClick={onCredits}>
            Credits
          </button>
        </div>
      </div>
    </section>
  );
}
