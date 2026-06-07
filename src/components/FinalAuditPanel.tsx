import { image2Assets } from "../data/image2Assets";
import { finalAuditArtFor, finalAuditSupportArt } from "../data/finalAuditArtAssets";
import { storyArtByKey } from "../data/storyArtAssets";
import type { EndingAuditDisplay, EndingId, MetricDefinition } from "../data/types";
import type { BranchEnding } from "../game/systems/agentRunner";

type FinalAuditPanelProps = {
  ending: BranchEnding;
  auditDisplay?: EndingAuditDisplay | null;
  metricDefinitions?: Record<string, MetricDefinition>;
  canCompare: boolean;
  onForceEnding: (endingId: EndingId) => void;
  onOpenEnding: () => void;
  onReturnSplit: () => void;
  onCompare: () => void;
  onReplay: () => void;
  onClose: () => void;
};

const qaEndingButtons: Array<[EndingId, string]> = [
  ["lighthouse_success", "楼内灯塔"],
  ["blue_zone_return", "蓝区归航"],
  ["aura_destroyed", "AURA 被摧毁"],
  ["aura_revoked", "AURA 被撤权"],
  ["sinking", "沉沦"]
];

export function FinalAuditPanel({
  ending,
  auditDisplay,
  canCompare,
  onForceEnding,
  onOpenEnding,
  onReturnSplit,
  onCompare,
  onReplay,
  onClose
}: FinalAuditPanelProps) {
  const audit = ending.finalAudit;
  const auditHeroArt = finalAuditArtFor("rd_story_day12_final_audit")?.uiPath ?? storyArtByKey.rd_story_day12_final_audit?.uiPath;
  const endingArt = finalAuditArtFor(ending.artKey)?.uiPath ?? storyArtByKey[ending.artKey]?.uiPath ?? auditHeroArt ?? image2Assets.shelterBackground.uiPath;

  return (
    <section className="modal-shell final-audit-shell" role="dialog" aria-modal="true" aria-label="Day 12 Final Audit">
      <div className={`modal-card wide-card final-audit-card ${ending.tone}`}>
        <div className="modal-heading">
          <div>
            <p className="panel-kicker">DAY 12 / FINAL AUDIT</p>
            <h2>{audit?.forced ? `${ending.title} · QA forced route` : ending.title}</h2>
          </div>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="final-audit-hero">
          <img alt="" src={endingArt} />
          <article className="final-audit-copy">
            <p>{ending.text}</p>
            <span>
              Branch: {ending.branch} / Selected ending: {audit?.selectedEndingId ?? ending.endingId}
            </span>
          </article>
        </div>

        {audit ? (
          <>
            {auditDisplay ? (
              <section className="ending-audit-display" aria-label="Ending condition checklist">
                <article className="ending-section ending-why">
                  <p className="panel-kicker">WHY THIS ENDING</p>
                  <ul className="ending-trace-list">
                    {(auditDisplay.why.length ? auditDisplay.why : [auditDisplay.replayText]).slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
                <article className="ending-section">
                  <p className="panel-kicker">ENDING CONDITIONS</p>
                  <div className="condition-checklist">
                    {auditDisplay.conditions.slice(0, 8).map((condition) => (
                      <div className={`condition-row ${condition.status}`} key={`${condition.label}:${condition.detail}`}>
                        <b>{condition.label}</b>
                        <span>{condition.detail}</span>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="ending-section">
                  <p className="panel-kicker">FINAL METRICS</p>
                  <div className="audit-metric-grid compact">
                    {auditDisplay.metrics.slice(0, 8).map((metric) => (
                      <div className={`audit-metric ${metric.status}`} key={metric.key} title={metric.help}>
                        <span>{metric.label}</span>
                        <b>{metric.value}</b>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="ending-section">
                  <p className="panel-kicker">DISPLAY CONTRACT</p>
                  <ul className="ending-trace-list">
                    <li>Day12 no task cards: {auditDisplay.noTaskCards ? "yes" : "check backend payload"}</li>
                    <li>signal is not blue_zone_evidence; both are shown separately.</li>
                    {auditDisplay.flags.slice(0, 3).map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                </article>
              </section>
            ) : null}

            <div className="final-audit-grid">
              {audit.candidates.map((candidate) => {
                const candidateArt = finalAuditArtFor(candidate.artKey)?.uiPath ?? storyArtByKey[candidate.artKey]?.uiPath ?? auditHeroArt ?? image2Assets.shelterBackground.uiPath;
                const visibleReasons = candidate.reasons.slice(0, 2);
                const hiddenReasonCount = candidate.reasons.length - visibleReasons.length;

                return (
                  <article className={`audit-candidate ${candidate.status} ${candidate.id === audit.selectedEndingId ? "selected" : ""}`} key={candidate.id}>
                    <img alt="" src={candidateArt} />
                    <div>
                      <p className="panel-kicker">{candidate.status}</p>
                      <h3>{candidate.title}</h3>
                      <ul>
                        {visibleReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      {hiddenReasonCount > 0 ? <span className="audit-reason-extra">+{hiddenReasonCount} audit notes</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <details className="final-audit-detail-drawer">
              <summary>Audit Evidence Details</summary>
              <div className="ending-section-grid final-audit-evidence-grid">
                <article className="ending-section">
                  <img alt="" className="final-audit-section-art" src={finalAuditSupportArt.evidenceChains.uiPath} />
                  <p className="panel-kicker">EVIDENCE CHAINS</p>
                  <ul className="ending-trace-list">
                    {audit.evidenceChains.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>

                <article className="ending-section">
                  <img alt="" className="final-audit-section-art" src={finalAuditSupportArt.failureDebt.uiPath} />
                  <p className="panel-kicker">FAILURE DEBT</p>
                  {(auditDisplay?.debts.length ?? audit.failureDebt.length) ? (
                    <ul className="ending-trace-list">
                      {(auditDisplay?.debts.length ? auditDisplay.debts : audit.failureDebt).slice(0, 8).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No unresolved failure debt recorded.</p>
                  )}
                </article>
              </div>
            </details>
          </>
        ) : null}

        <details className="developer-controls final-audit-debug">
          <summary>QA Ending Routes</summary>
          <div className="developer-control-grid final-audit-force-grid">
            {qaEndingButtons.map(([id, label]) => (
              <button className="ghost" onClick={() => onForceEnding(id)} key={id}>
                Force {label}
              </button>
            ))}
          </div>
        </details>

        <div className="modal-actions">
          <button onClick={onOpenEnding}>Open Ending Card</button>
          <button className="ghost" onClick={onReplay}>
            查看 Replay
          </button>
          <button className="ghost" onClick={onReturnSplit}>
            运行另一分支
          </button>
          {canCompare ? (
            <button className="ghost" onClick={onCompare}>
              Compare Branches
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
