import { generatedAssetByName } from "../data/asset-manifest.generated";
import { dayPlans } from "../data/dayPlanData";
import type { AgentRunState } from "../data/types";

type DayTimelineProps = {
  runState: AgentRunState;
};

export function DayTimeline({ runState }: DayTimelineProps) {
  return (
    <section className="day-timeline" aria-label="Day timeline" data-testid="day-timeline">
      {dayPlans.map((plan) => {
        const isCurrent = runState.currentDay === plan.day;
        const isDone = runState.currentDay > plan.day || (runState.currentDay === plan.day && runState.currentPhase === "ending");
        const isBranch = plan.day === 7;
        const isAudit = plan.day === 12;
        const label = `D${String(plan.day).padStart(2, "0")}`;
        return (
          <div
            className={`timeline-node ${isCurrent ? "current" : ""} ${isDone ? "done" : ""} ${isBranch ? "branch" : ""}`}
            data-no-overflow
            key={plan.day}
            title={`${label} · ${plan.title}${isAudit ? " · Final Audit" : isBranch ? " · Branch" : ""}`}
          >
            <img alt="" className="timeline-node-art" src={generatedAssetByName["timeline-node"].uiPath} />
            <span>{isDone ? "✓" : isAudit ? "◎" : isBranch ? "◇" : String(plan.day).padStart(2, "0")}</span>
            <b>{label}</b>
          </div>
        );
      })}
      <div className={`timeline-node ending ${runState.currentPhase === "ending" ? "current" : ""}`} data-no-overflow>
        <img alt="" className="timeline-node-art" src={generatedAssetByName["timeline-node"].uiPath} />
        <span>E</span>
        <b>END</b>
      </div>
    </section>
  );
}
