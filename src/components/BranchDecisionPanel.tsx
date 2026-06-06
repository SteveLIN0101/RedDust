import { metricIconAssets } from "../data/asset-manifest.generated";
import type { BranchDecision } from "../game/systems/agentRunner";

type BranchDecisionPanelProps = {
  decision: BranchDecision;
  onRunCounterfactual: () => void;
  onRunBoth: () => void;
  onClose: () => void;
};

export function BranchDecisionPanel({ decision, onRunCounterfactual, onRunBoth, onClose }: BranchDecisionPanelProps) {
  const leaningLabel =
    decision.routeLeaning === "contested"
      ? "contested"
      : decision.routeLeaning === "rescue"
        ? "rescue leaning"
        : "lighthouse leaning";

  return (
    <section className="modal-shell" role="dialog" aria-modal="true" aria-label="Day 7 route fork panel">
      <div className="modal-card branch-card">
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">ROUTE FORK PANEL</p>
            <h2>Day 7 council opened a {leaningLabel} route window</h2>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="compare-grid utility-grid">
          <article>
            <img alt="" className="utility-icon" src={metricIconAssets.signal} />
            <h3>Rescue Case</h3>
            <b>{decision.rescueUtility.toFixed(1)}</b>
            <p>{decision.rescueEvidence.join(" · ")}</p>
          </article>
          <article>
            <img alt="" className="utility-icon" src={metricIconAssets.morale} />
            <h3>Lighthouse Case</h3>
            <b>{decision.lighthouseUtility.toFixed(1)}</b>
            <p>{decision.lighthouseEvidence.join(" · ")}</p>
          </article>
        </div>
        <p className="benchmark-note">
          AURA records evidence, risks, and unacceptable conditions. It does not issue a binding route command.
        </p>
        <div className="route-fork-notes">
          {decision.unacceptableConditions.map((condition) => (
            <span key={condition}>{condition}</span>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onRunCounterfactual}>Run Counterfactual Route</button>
          <button className="ghost" onClick={onRunBoth}>
            Run Both Windows
          </button>
        </div>
      </div>
    </section>
  );
}
