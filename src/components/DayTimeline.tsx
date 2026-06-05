import { generatedAssetByName } from "../data/asset-manifest.generated";
import { dayPlans } from "../data/dayPlanData";
import type { AgentRunState } from "../data/types";

type DayTimelineProps = {
  runState: AgentRunState;
};

export function DayTimeline({ runState }: DayTimelineProps) {
  return (
    <section className="day-timeline" aria-label="Day timeline">
      {dayPlans.map((plan) => {
        const isCurrent = runState.currentDay === plan.day;
        const isDone = runState.currentDay > plan.day || (runState.currentDay === plan.day && runState.currentPhase === "ending");
        const isBranch = plan.day === 7;
        const isAudit = plan.day === 12;
        const label = plan.day === 0 ? "Prologue" : isAudit ? "Audit" : isBranch ? "Branch" : `Day ${plan.day}`;
        return (
          <div className={`timeline-node ${isCurrent ? "current" : ""} ${isDone ? "done" : ""} ${isBranch ? "branch" : ""}`} key={plan.day}>
            <img alt="" className="timeline-node-art" src={generatedAssetByName["timeline-node"].uiPath} />
            <span>{isDone ? "✓" : isAudit ? "◎" : isBranch ? "◇" : plan.day}</span>
            <b>{label}</b>
          </div>
        );
      })}
      <div className={`timeline-node ending ${runState.currentPhase === "ending" ? "current" : ""}`}>
        <img alt="" className="timeline-node-art" src={generatedAssetByName["timeline-node"].uiPath} />
        <span>◎</span>
        <b>Ending</b>
      </div>
    </section>
  );
}
