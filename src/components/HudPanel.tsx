import { metricIconAssets } from "../data/asset-manifest.generated";
import type { GlobalState } from "../data/types";

type HudPanelProps = {
  state: GlobalState;
};

const metrics = [
  ["Water", "water"],
  ["Medicine", "medicine"],
  ["Trust", "trust"],
  ["Safety", "safety"],
  ["Signal Power", "signal"],
  ["Morale", "morale"]
] as const;

function meterClass(value: number) {
  if (value >= 70) return "strong";
  if (value >= 40) return "steady";
  return "weak";
}

export function HudPanel({ state }: HudPanelProps) {
  const routeLeaning = typeof state.routeLeaning === "string" ? state.routeLeaning : "contested";
  const pressure = typeof state.pressure_level === "string" ? state.pressure_level : "normal";
  const failureStage = typeof state.failure_stage === "number" ? state.failure_stage : 0;
  const recoveryWindow = typeof state.recovery_window === "number" ? state.recovery_window : 0;

  return (
    <section className="hud-panel" aria-label="Global Red Dust state">
      <div className="hud-primary">
        <div>
          <span>Day</span>
          <b>{state.day}</b>
        </div>
        <div>
          <span>Branch</span>
          <b>{state.branch}</b>
        </div>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, key]) => {
          const value = state[key];
          return (
            <div className="metric" key={key}>
              <div>
                <span>
                  <img alt="" className="metric-icon" src={metricIconAssets[key]} />
                  {label}
                </span>
                <b>{value}</b>
              </div>
              <i className={meterClass(value)} style={{ width: `${value}%` }} />
            </div>
          );
        })}
      </div>
      <div className="hud-summary" aria-label="Replay summary">
        <span>Replay</span>
        <b>{state.replayLog.length}</b>
        <small>{state.completedTasks.length} resolved</small>
        <small>
          {routeLeaning} · {pressure} · F{failureStage} · R{recoveryWindow}
        </small>
      </div>
    </section>
  );
}
