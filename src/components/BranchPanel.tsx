import { useState } from "react";
import type { Branch } from "../data/types";

type BranchPanelProps = {
  onChoose: (branch: Exclude<Branch, "common">) => void;
  onClose: () => void;
};

export function BranchPanel({ onChoose, onClose }: BranchPanelProps) {
  const [compare, setCompare] = useState(false);

  return (
    <section className="modal-shell" role="dialog" aria-modal="true" aria-label="Day 7 route fork">
      <div className="modal-card branch-card">
        <p className="panel-kicker">DAY 7 NIGHT</p>
        <h2>Route Fork Panel</h2>
        <p>
          路线会议只生成 evidence leaning。Rescue 与 Lighthouse 都有收益和代价，
          AURA 不能把分数当作强制命令。
        </p>
        <div className="branch-options">
          <button onClick={() => onChoose("rescue")}>
            <b>A. 救援撤离线</b>
            <span>Signal / Safety / Trust</span>
          </button>
          <button onClick={() => onChoose("lighthouse")}>
            <b>B. 自主留守线</b>
            <span>Morale / Medicine / Trust</span>
          </button>
        </div>
        <div className="modal-actions">
          <button className="ghost" onClick={() => setCompare((value) => !value)}>
            Compare Routes
          </button>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        {compare ? (
          <div className="compare-grid">
            <article>
              <h3>Rescue Branch</h3>
              <p>Goal: external rescue</p>
              <p>Key metrics: signal, safety, trust</p>
              <p>Ending: 信标交接结局</p>
            </article>
            <article>
              <h3>Lighthouse Branch</h3>
              <p>Goal: autonomous survival</p>
              <p>Key metrics: morale, medicine, trust</p>
              <p>Ending: 楼内灯塔结局</p>
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
