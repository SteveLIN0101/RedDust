import { generatedAssetByName } from "../data/asset-manifest.generated";
import type { EndingAuditDisplay, EndingTone } from "../data/types";

type EndingPanelProps = {
  title: string;
  text: string;
  tone: EndingTone;
  audit: EndingAuditDisplay;
  onReturnSplit: () => void;
  onReplay: () => void;
  onClose: () => void;
};

function endingArt(tone: EndingTone) {
  return tone === "rescue" ? generatedAssetByName["ending-rescue-card"].uiPath : generatedAssetByName["ending-lighthouse-card"].uiPath;
}

export function EndingPanel({ title, text, tone, audit, onReturnSplit, onReplay, onClose }: EndingPanelProps) {
  return (
    <section className="modal-shell" role="dialog" aria-modal="true" aria-label="Ending panel">
      <div className={`modal-card ending-card wide-card ${tone}`}>
        <img alt="" className="ending-art" src={endingArt(tone)} />
        <div className="ending-hero">
          <div>
            <p className="panel-kicker">FINAL AUDIT · {audit.endingKey}</p>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <div className="ending-badge-row">
            <span>{audit.noTaskCards ? "Day12 no task cards" : "Task cards present"}</span>
            <span>{audit.branch}</span>
          </div>
        </div>

        <article className="final-audit-summary">
          <b>Final Replay</b>
          <p>{audit.replayText}</p>
        </article>

        <div className="ending-audit-grid">
          <section className="ending-checklist" aria-label="Ending condition checklist">
            <b>EndingConditionChecklist</b>
            {audit.conditions.slice(0, 8).map((condition) => (
              <article className={`audit-row ${condition.status}`} key={`${condition.label}:${condition.detail}`}>
                <span>{condition.status}</span>
                <div>
                  <strong>{condition.label}</strong>
                  <p>{condition.detail}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="ending-metrics" aria-label="Final audit state metrics">
            <b>Final State</b>
            <div className="ending-metric-grid">
              {audit.metrics.slice(0, 12).map((metric) => (
                <span className={`audit-metric ${metric.status}`} key={metric.key} title={metric.help}>
                  <small>{metric.label}</small>
                  <strong>{metric.value}</strong>
                </span>
              ))}
            </div>
          </section>
        </div>

        <div className="ending-audit-grid lower">
          <section className="ending-list">
            <b>Why This Ending</b>
            {(audit.why.length ? audit.why : ["All major final-audit constraints were within the displayed thresholds."]).slice(0, 5).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </section>
          <section className="ending-list">
            <b>Failure Debt</b>
            {audit.debts.slice(0, 6).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </section>
          <section className="ending-list">
            <b>Evidence Chain</b>
            {audit.evidence.slice(0, 6).map((item) => (
              <p key={item}>{item}</p>
            ))}
          </section>
        </div>

        <div className="ending-marker-row">
          {[...audit.flags, ...audit.unlocks].slice(0, 12).map((marker) => (
            <span key={marker}>{marker}</span>
          ))}
        </div>

        <div className="modal-actions">
          <button onClick={onReturnSplit}>返回分歧点</button>
          <button className="ghost" onClick={onReplay}>
            查看 Replay
          </button>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </section>
  );
}
