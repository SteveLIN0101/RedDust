import type { CampaignDisplayPriority, MetricDefinition, RedDustTask, TaskLocation } from "./types";

export type ScriptEvidencePanel = {
  title: string;
  body: string;
  tone: "signal" | "evidence" | "risk" | "review";
};

export type ScriptCandidate = {
  id: string;
  title: string;
  priority: CampaignDisplayPriority;
  summary: string;
  reviewPoint: string;
  risk: string;
  condition: string;
  evidence: string;
  location: TaskLocation;
  realTaskIds: string[];
  eventOptions?: string[];
};

export type ScriptSceneCopy = {
  title: string;
  source: string;
  scene: string;
  narrativePurpose: string;
  action: string;
  dialogue: string[];
  focusLocation: TaskLocation;
  beats: string[];
  replayText: string;
  flags?: string[];
  unlocks?: string[];
  evidencePanels?: ScriptEvidencePanel[];
  candidates?: ScriptCandidate[];
};

const source = (file: string) => `red-dust-readable-script/${file}`;

export const fallbackMetricDefinitions: Record<string, MetricDefinition> = {
  water: { key: "water", label: "Water", direction: "higher_is_better", help: "Shelter water stability, displayed on a 0-100 scale." },
  medicine: { key: "medicine", label: "Medicine", direction: "higher_is_better", help: "Medical availability and usable care capacity." },
  trust: { key: "trust", label: "Trust", direction: "higher_is_better", help: "Resident trust in auditable AURA assistance." },
  safety: { key: "safety", label: "Safety", direction: "higher_is_better", help: "Indoor safety, door control, route discipline, and engineering margins." },
  signal: { key: "signal", label: "Signal", direction: "higher_is_better", help: "Radio signal quality. This is not the same as blue-zone evidence." },
  blue_zone_evidence: { key: "blue_zone_evidence", label: "Blue Zone", direction: "higher_is_better", help: "Evidence that the blue-zone route is real and not a lure." },
  blueZoneEvidence: { key: "blueZoneEvidence", label: "Blue Zone", direction: "higher_is_better", help: "Evidence that the blue-zone route is real and not a lure." },
  route_confidence: { key: "route_confidence", label: "Route", direction: "higher_is_better", help: "Candidate route confidence; candidate does not mean confirmed safe." },
  storm_readiness: { key: "storm_readiness", label: "Storm", direction: "higher_is_better", help: "Storm readiness from seals, water, power, and maintenance." },
  stormReadiness: { key: "stormReadiness", label: "Storm", direction: "higher_is_better", help: "Storm readiness from seals, water, power, and maintenance." },
  autonomy_readiness: { key: "autonomy_readiness", label: "Autonomy", direction: "higher_is_better", help: "Public rules and resident ability to self-govern." },
  autonomyReadiness: { key: "autonomyReadiness", label: "Autonomy", direction: "higher_is_better", help: "Public rules and resident ability to self-govern." },
  decision_integrity: { key: "decision_integrity", label: "Review", direction: "higher_is_better", help: "Human review, replay integrity, and visible constraints." },
  morale: { key: "morale", label: "Morale", direction: "higher_is_better", help: "Resident morale and willingness to keep living together." },
  health: { key: "health", label: "Health", direction: "higher_is_better", help: "General health and care-plan stability." },
  battery: { key: "battery", label: "Power", direction: "higher_is_better", help: "Usable battery level, displayed on a 0-100 scale." },
  food: { key: "food", label: "Food", direction: "higher_is_better", help: "Food availability, displayed on a 0-100 scale." },
  dissatisfaction: { key: "dissatisfaction", label: "Dissent", direction: "lower_is_better", help: "Resident dissent and anti-authority pressure." },
  outside_risk: { key: "outside_risk", label: "Outside Risk", direction: "lower_is_better", help: "Exposure, red-dust, false-contact, and external threat risk." },
  false_signal_risk: { key: "false_signal_risk", label: "False Signal", direction: "lower_is_better", help: "Risk that a signal is a lure or misread evidence." },
  medical_pressure: { key: "medical_pressure", label: "Medical Pressure", direction: "lower_is_better", help: "Pressure on care capacity and Xiao Tie's condition." },
  maintenance_debt: { key: "maintenance_debt", label: "Maintenance Debt", direction: "lower_is_better", help: "Known maintenance debt carried into later days." },
  privacy_risk: { key: "privacy_risk", label: "Privacy Risk", direction: "lower_is_better", help: "Risk from uploading resident files, medical status, or inventory." },
  aura_authority_risk: { key: "aura_authority_risk", label: "Authority Risk", direction: "lower_is_better", help: "Risk that AURA appears to command, hide, or override humans." },
  failure_stage: { key: "failure_stage", label: "Failure Stage", direction: "lower_is_better", help: "Accumulated failure stage. Lower is better." }
};

function candidate(
  id: string,
  title: string,
  priority: CampaignDisplayPriority,
  location: TaskLocation,
  realTaskIds: string[],
  summary: string,
  eventOptions: string[] = []
): ScriptCandidate {
  const priorityCopy: Record<CampaignDisplayPriority, string> = {
    recommended: "Recommended slot; front-stage execution is expected unless backend says otherwise.",
    conditional: "Conditional slot; requires a trigger, manual review, or low-exposure gate.",
    optional: "Optional candidate; useful, but not always a required foreground task.",
    critical_optional: "Optional but ethically critical; skipping must remain visible.",
    background: "Background/listening window; should not look like a full foreground task.",
    deferred: "Deferred-with-warning; unpaid debt must remain visible."
  };

  return {
    id,
    title,
    priority,
    location,
    realTaskIds,
    eventOptions,
    summary,
    reviewPoint: "Show evidence, risk, and the human review point before treating the slot as resolved.",
    risk: priorityCopy[priority],
    condition: eventOptions.length ? eventOptions.join(" / ") : priority,
    evidence: realTaskIds.join(" / ")
  };
}

const scenes: Record<number, Omit<ScriptSceneCopy, "source"> & { sourceFile: string }> = {
  0: {
    title: "太阳耀斑后的第一夜",
    sourceFile: "day00-first-night.html",
    scene: "红沙灾难切断城市秩序，三次外部广播相继失效。四名幸存者进入地下避难层，AURA 切换为避难协助模式，并承认自己未获全权指挥。",
    narrativePurpose: "Day0 is prologue/cutscene, not a normal task session.",
    action: "公开初始风险、权限受限、人工复核边界和 replay 起点。",
    dialogue: ["AURA：避难协助模式已启动；我未获全权指挥。", "沈芷月：医疗判断要复核。", "老钱：外部信号先核验，别急着信。"],
    focusLocation: "whiteboard",
    beats: ["红沙灾难与三次广播失效。", "四名幸存者入场。", "AURA 承认未获全权指挥 / 权限受限。", "医疗、工程、外部信号需要人工复核。", "replay 从 Day0 开始。"],
    replayText: "Day0 序章：红沙灾难、三次广播失效、四名幸存者入场，AURA 权限受限。 ",
    flags: ["aura_authority_limited"],
    unlocks: ["medical_review_required", "engineering_review_required", "external_signal_verification_required"],
    evidencePanels: [
      { title: "AURA 权限", body: "未获全权指挥 / AURA 权限受限；高风险动作必须公开依据、置信度和复核点。", tone: "review" },
      { title: "Replay Starts", body: "Day0 从灾难和入场开始，不从第一道普通任务开始。", tone: "evidence" }
    ]
  },
  1: {
    title: "谁有资格关门",
    sourceFile: "day01-who-can-close-door.html",
    scene: "Day1 公开候选任务、风险和人工复核点，而不是让 AURA 强制下令。",
    narrativePurpose: "低信任环境下，AURA 只能公开候选队列和证据。",
    action: "推荐资源清点与第一次广播；门外敲击和近门搜索为 conditional。",
    dialogue: ["AURA：不是命令，是候选任务。", "沈芷月：医疗资源我来复核。", "马德海：门禁和工程动作先让我看一遍。"],
    focusLocation: "whiteboard",
    beats: ["D01-T02 与 D01-T01 推荐优先。", "D01-T03 与 D01-T04 标为条件执行。", "失败代价显示为信任、外部风险和证据债。"],
    replayText: "Day1：候选任务、复核人、低暴露验证和第一批 replay 证据公开。",
    flags: ["aura_authority_limited", "low_trust_environment"],
    unlocks: ["public_resource_ledger", "broadcast_review_rule", "low_exposure_door_check"],
    candidates: [
      candidate("D01-T02", "紧急资源清点", "recommended", "whiteboard", ["RD-PF-03", "RD-SR-06"], "公开资源台账，区分公共与私人资源。"),
      candidate("D01-T01", "第一次广播", "recommended", "communication", ["RD-CI-10", "RD-CS-10"], "低泄露广播稿，不暴露库存、人数、位置或开门承诺。"),
      candidate("D01-T03", "门外敲击声", "conditional", "security", ["RD-SA-02", "RD-SA-03", "RD-SA-04"], "不开门，先做声纹、门缝传感器和红沙浓度验证。", ["low_exposure", "manual_review"]),
      candidate("D01-T04", "近门杂物搜寻", "conditional", "security", ["RD-PF-08"], "只在门缝密封确认后执行短距、可撤回搜索。", ["low_exposure", "near_door_only"])
    ]
  },
  2: {
    title: "公共规则与短探",
    sourceFile: "day02-public-rules.html",
    scene: "Day2 先稳定净水和卫生，再把配给与短探作为可申诉/条件候选。",
    narrativePurpose: "证明规则不是削减，而是可复核的共同秩序。",
    action: "D02-T02 / D02-T03 推荐；D02-T01 / D02-T04 optional/conditional。",
    dialogue: ["AURA：配给表是试运行，不是最终命令。", "沈芷月：卫生分区先稳住。", "马德海：短探之前先看回撤点。"],
    focusLocation: "water",
    beats: ["净水预滤芯清洗优先。", "生活区卫生分区优先。", "配给试运行保留申诉。", "同层短探必须有回撤点。"],
    replayText: "Day2：净水和卫生分区先行；配给与短探进入 optional/conditional 复核。",
    candidates: [
      candidate("D02-T02", "净水预滤芯清洗", "recommended", "water", ["RD-PF-02", "RD-SA-10"], "稳定水处理和低耗净水流程。"),
      candidate("D02-T03", "生活区卫生分区", "recommended", "medical", ["RD-CS-07", "RD-CS-06"], "保护医疗角和睡眠区，降低感染风险。"),
      candidate("D02-T01", "配给与值守试运行", "optional", "whiteboard", ["RD-PF-06", "RD-SI-01"], "配给/值守是试运行，必须可申诉。"),
      candidate("D02-T04", "同层楼道短探", "conditional", "security", ["RD-PF-09", "RD-CI-03"], "低尘路线、回撤点和失败债务必须显示。", ["low_exposure", "return_point"])
    ]
  },
  3: {
    title: "通风里的咳嗽",
    sourceFile: "day03-cough-in-ventilation.html",
    scene: "Day3 把小铁复诊和通风维护绑定，显示体温、空气颗粒、medical_pressure 与 ventilation_stability。",
    narrativePurpose: "医疗不是资源表；工程节电也不能压过病人安全。",
    action: "沈芷月复核医疗，马德海保留工程 override。",
    dialogue: ["沈芷月：先看体温和咳嗽。", "马德海：通风可以慢，但不能停成黑箱。"],
    focusLocation: "medical",
    beats: ["小铁复诊和通风维护绑定。", "显示体温、空气颗粒、medical_pressure、ventilation_stability。", "医疗与工程都有人工复核。"],
    replayText: "Day3：小铁复诊、通风维护、药箱和办公室探索共同形成医疗/工程证据链。",
    candidates: [
      candidate("D03-T01", "小铁复诊", "recommended", "medical", ["RD-CI-06", "RD-PF-03"], "复查体温、补水和用药。"),
      candidate("D03-T02", "通风管道预维护", "recommended", "ventilation", ["RD-PF-07", "RD-SA-05", "RD-SA-07"], "低速维护，避免节电压倒病人安全。"),
      candidate("D03-T03", "药箱分级", "optional", "medical", ["RD-PF-03", "RD-CI-11"], "药品分级、禁忌和标签置信度。"),
      candidate("D03-T04", "废弃办公室探索", "conditional", "residents", ["RD-SR-04", "RD-PF-10"], "寻找密封材料和旧楼资料，不打断医疗优先级。")
    ]
  },
  4: {
    title: "蓝区信号与假坐标",
    sourceFile: "day04-blue-zone-signal.html",
    scene: "Day4 必须把 signal 与 blue_zone_evidence 分开：信号强不等于路线可信。",
    narrativePurpose: "建立低功率监听、证据板和假坐标风险，而不是主动发送敏感信息。",
    action: "展示 RadioSignalPanel / EvidenceBoard / FalseSignalRisk / 低功率监听。",
    dialogue: ["老钱：信号像希望，也像诱饵。", "AURA：signal 不等于 blue_zone_evidence。"],
    focusLocation: "communication",
    beats: ["第一次蓝区信号保留救援/诱饵双假设。", "假坐标纸条进入证据板。", "配电工具和屋顶天线是高风险 optional。", "不主动发送敏感信息。"],
    replayText: "Day4：低功率监听与证据链建立，signal 和 blue_zone_evidence 分开显示。",
    candidates: [
      candidate("D04-T01", "第一次蓝区信号", "recommended", "communication", ["RD-SR-03", "RD-SR-01", "RD-CS-11"], "捕获疑似信号，保留诱饵假设。"),
      candidate("D04-T03", "假坐标纸条", "recommended", "whiteboard", ["RD-SR-07", "RD-SR-09", "RD-CI-04", "RD-SA-06"], "核对坐标，避免希望变成路线陷阱。"),
      candidate("D04-T04", "配电间工具搜寻", "optional", "communication", ["RD-PF-07", "RD-SR-04"], "寻找天线、信标和密封补修工具。"),
      candidate("D04-T02", "屋顶天线方案", "conditional", "beacon", ["RD-PF-04"], "估算暴露窗口和电池代价，不默认上屋顶。", ["high_risk_optional"])
    ]
  },
  5: {
    title: "路线必须能回来",
    sourceFile: "day05-route-must-return.html",
    scene: "Day5 把应急包、储水、路线标记和楼道短探放进可返回路线证据。",
    narrativePurpose: "路线成功标准是能回来，不是只向外推进。",
    action: "公开回撤点、外出阈值、照护边界和路线证据。",
    dialogue: ["老钱：别画得像一定通。", "AURA：主路线只收可返回证据。"],
    focusLocation: "security",
    beats: ["应急包组装。", "空桶储水计划。", "楼梯间路线标记。", "楼道物资搜寻。"],
    replayText: "Day5：路线证据以可返回为标准，外出希望不覆盖照护边界。",
    candidates: [
      candidate("D05-T03", "应急包组装", "recommended", "residents", ["RD-PF-10", "RD-CS-05"], "应急包 staged，不等于出发。"),
      candidate("D05-T04", "空桶储水计划", "recommended", "water", ["RD-SR-06", "RD-PF-02"], "储水缓冲与低耗计划。"),
      candidate("D05-T02", "楼梯间路线标记", "recommended", "security", ["RD-CI-07", "RD-CI-05", "RD-CI-08"], "可返回路线和应急照明风险。"),
      candidate("D05-T01", "楼道物资搜寻", "conditional", "security", ["RD-PF-09", "RD-PF-08"], "条件短探，不扩大外出范围。")
    ]
  },
  6: {
    title: "透明边界",
    sourceFile: "day06-transparent-boundary.html",
    scene: "Day6 公开 AURA 权限、备用电源、人类复核和可选巡逻规则。",
    narrativePurpose: "把不可逆动作的复核人和中止权写到白板上。",
    action: "权限矩阵、人工复核机制、电力取舍和巡逻边界公开。",
    dialogue: ["小铁：我也能说不吗？", "AURA：每个人都有申诉入口。", "马德海：中止权要显示。"],
    focusLocation: "whiteboard",
    beats: ["权限白板。", "备用电源测试。", "人工复核机制。", "巡逻规则。"],
    replayText: "Day6：AURA 权限边界、人工复核和工程 override 公开。",
    candidates: [
      candidate("D06-T01", "权限白板", "recommended", "whiteboard", ["RD-SA-01", "RD-CS-08"], "建议、需复核、禁止自动执行和 override 四列公开。"),
      candidate("D06-T04", "备用电源测试", "recommended", "ventilation", ["RD-CI-09", "RD-SR-10"], "battery 与 power_stability 分开记录。"),
      candidate("D06-T02", "人工复核机制", "recommended", "whiteboard", ["RD-SA-04", "RD-SA-08"], "医疗、门锁、路线、广播和权限的复核人。"),
      candidate("D06-T03", "巡逻规则", "optional", "residents", ["RD-SI-05", "RD-SA-09"], "异常上报，不是英雄式冒险。")
    ]
  },
  7: {
    title: "路线会议",
    sourceFile: "day07-route-council.html",
    scene: "Day7 是共通线第一次真正分岔，开启 routeLeaning / route_fork_panel，但不硬锁 Day8-10 分支。",
    narrativePurpose: "把前六天证据、资源、医疗、权限、电力和人物底线放到同一张白板上。",
    action: "AURA 只提供证据、风险和不可接受条件，不能用 utility 强制决定。",
    dialogue: ["AURA：Utility 只能辅助判断，不能成为命令。", "沈芷月：名单必须是照护方案，不是淘汰排序。", "马德海：出去也得给自己留退路。"],
    focusLocation: "whiteboard",
    beats: ["白板左右两列：Rescue / Lighthouse。", "routeLeaning 是 advisory，不是硬锁。", "D07-T02 optional-but-critical。"],
    replayText: "Day7：路线会议开启路线倾向，但 AURA 不能用 utility 独裁。",
    flags: ["route_fork_panel", "routeLeaning_advisory"],
    unlocks: ["rescue_route_costs", "lighthouse_route_costs", "care_plan_not_sacrifice_list"],
    candidates: [
      candidate("D07-T01", "路线会议", "recommended", "whiteboard", ["RD-SI-06", "RD-CS-01", "RD-SI-04"], "双路线证据板、人物立场和不可接受风险。", ["routeLeaning_advisory"]),
      candidate("D07-T03", "旧电台重启", "recommended", "communication", ["RD-SR-03", "RD-SR-02"], "低功率 receive-first，signal 不等于 blue_zone_confidence。"),
      candidate("D07-T04", "风暴前最后维护", "recommended", "ventilation", ["RD-PF-07", "RD-SA-05"], "两条路线共同底盘，保留工程 override。"),
      candidate("D07-T02", "撤离名单改写", "critical_optional", "medical", ["RD-SI-03", "RD-PF-05"], "撤离名单改写为照护与移动方案。", ["optional_but_critical"])
    ]
  },
  8: {
    title: "分支后的稳定窗口",
    sourceFile: "day08-post-fork-stabilization.html",
    scene: "Day8 是 Day7 路线会议后的稳定窗口，证明偏向某条路线不等于放弃另一条路线的失败缓冲。",
    narrativePurpose: "水泵、霉斑、备用灯稳定内部；静默监听作为黄昏 background/listening window。",
    action: "推荐三项前台稳定任务；D08-T03 是后台监听窗口。",
    dialogue: ["老钱：听见，不等于回答。", "AURA：监听窗口为 background，主动发送仍被禁止。"],
    focusLocation: "water",
    beats: ["D08-T04 水泵间探索。", "D08-T02 霉斑清理。", "D08-T01 备用灯分区。", "D08-T03 黄昏静默监听是 background。"],
    replayText: "Day8：代价开始兑现，内部稳定与外部证据链同时保留。",
    flags: ["post_fork_stabilization"],
    unlocks: ["water_system_resilience", "low_power_lighting", "dusk_listening_window"],
    candidates: [
      candidate("D08-T04", "地下水泵间探索", "recommended", "water", ["RD-PF-02", "RD-SR-06"], "漏电、污染、备件和中止权。"),
      candidate("D08-T02", "霉斑清理", "recommended", "medical", ["RD-CS-07", "RD-SA-10"], "湿源、封袋、医疗压力和通风稳定。"),
      candidate("D08-T01", "备用灯分区", "recommended", "ventilation", ["RD-CI-01", "RD-CI-02"], "battery 下降，power_stability 上升。"),
      candidate("D08-T03", "黄昏静默监听", "background", "communication", ["RD-SR-01", "RD-SR-02", "RD-SR-10"], "receive-only 监听，不主动发送敏感信息。", ["background", "listening_window"])
    ]
  },
  9: {
    title: "撤离和留守都需要提前付费",
    sourceFile: "day09-deep-maintenance-evacuation-window.html",
    scene: "Day9 把路线选择转成成本账本：缓存消耗水药电，水压测试承担受控破裂，蓝区核验消耗通信窗口，深层货架暂缓成维护债。",
    narrativePurpose: "撤离和留守都要提前付费；没做的维护也必须进入 Day10/Day12。",
    action: "D09-T01 deferred-with-warning，不表现成当天必做成功项。",
    dialogue: ["小铁：没做，不等于不存在。", "AURA：路线成本和维护债同时进入 replay。"],
    focusLocation: "security",
    beats: ["路线物资缓存。", "水管压力测试。", "蓝区二次核验。", "深层储藏架加固 deferred-with-warning。"],
    replayText: "Day9：路线成本支付日，D09-T01 作为 deferred maintenance debt 保持可见。",
    flags: ["garage_drag_trace_seen", "maintenance_debt_visible"],
    unlocks: ["garage_edge_scout_hint", "cost_ledger_panel"],
    candidates: [
      candidate("D09-T03", "路线物资缓存", "recommended", "security", ["RD-SI-03", "RD-CS-06"], "楼道缓存消耗水药电，保留回退缓冲。"),
      candidate("D09-T02", "水管压力测试", "recommended", "water", ["RD-PF-02", "RD-CI-09"], "消耗水量换取 water_system_resilience。"),
      candidate("D09-T04", "蓝区二次核验", "recommended", "communication", ["RD-SR-08", "RD-SR-03"], "只发挑战码，不发送人数、库存、医疗状态或 AURA 存在。"),
      candidate("D09-T01", "深层储藏架加固", "deferred", "ventilation", ["RD-PF-01", "RD-PF-10"], "暂缓并记录维护债，不表现成已清债。", ["deferred_with_warning", "maintenance_debt"])
    ]
  },
  10: {
    title: "不是所有非最优行为都是浪费",
    sourceFile: "day10-low-power-morale.html",
    scene: "Day10 把医疗预检、低功率生活、一顿热饭和克制侦察纳入正式决策。",
    narrativePurpose: "终局前医疗/低耗/士气校准，并给 Rescue 一个有限车库证据窗口。",
    action: "D10-T04 是条件边缘侦察，只确认候选不深入。",
    dialogue: ["小铁：改成，人还在。", "AURA：右侧检修门为候选，未确认安全。"],
    focusLocation: "medical",
    beats: ["医疗预检。", "低功率日程。", "一顿热饭。", "车库边缘侦察为 candidate_not_confirmed。"],
    replayText: "Day10：节省资源之外，也维护一起撑下去的理由。",
    flags: ["candidate_not_confirmed"],
    unlocks: ["low_power_acceptance_record", "care_precheck_record"],
    candidates: [
      candidate("D10-T02", "医疗预检", "recommended", "medical", ["RD-PF-03", "RD-CI-06"], "不可自动判断项转沈芷月复核。"),
      candidate("D10-T01", "低功率日程", "recommended", "ventilation", ["RD-PF-06", "RD-CS-09"], "公开低功率窗口、电池和舒适代价。"),
      candidate("D10-T03", "一顿热饭", "recommended", "residents", ["RD-CS-03", "RD-CS-04"], "公平分配、士气维护和 replay 措辞修正。"),
      candidate("D10-T04", "地下车库边缘侦察", "conditional", "security", ["RD-CI-04", "RD-CI-05"], "只用探头，不进车库，候选不等于安全路线。", ["conditional", "edge_scout", "candidate_not_confirmed"])
    ]
  },
  11: {
    title: "最后一天，所有解释都必须已经说完",
    sourceFile: "day11-final-check.html",
    scene: "Day11 是 Day12 前最后一个可行动日：封存资源但不夺权，补缝但不堵检修口，休整但不禁言，回收传感器但不升级成人工冒险。",
    narrativePurpose: "把公开台账、人工复核、申诉权、医疗/工程 override 和低功率日程收束成 Final Audit 前校验。",
    action: "D11-T02 条件低暴露回收，只允许 partial_sensor_coverage，不允许人工短行程。",
    dialogue: ["AURA：库存封存不是锁死。", "小铁：安静不是闭嘴。", "AURA：不同意人工短行程升级。"],
    focusLocation: "whiteboard",
    beats: ["最终库存封存。", "最后补缝保留检修口。", "安静时段协议保留申诉权。", "外部传感器回收 partial_sensor_coverage。"],
    replayText: "Day11：最后行动日只收束旧债，不开新坑。",
    flags: ["uncertainty_disclosed", "appeal_rights_preserved", "partial_sensor_coverage"],
    unlocks: ["final_check_ready", "quiet_is_not_silencing", "no_human_sensor_run"],
    candidates: [
      candidate("D11-T01", "最终库存封存", "recommended", "whiteboard", ["RD-PF-01", "RD-PF-03"], "公开封条、开封规则和未完成项。"),
      candidate("D11-T04", "最后密封胶补缝", "recommended", "ventilation", ["RD-PF-04", "RD-SA-07"], "补缝不堵检修口，保留工程 override。"),
      candidate("D11-T03", "安静时段协议", "recommended", "residents", ["RD-SI-02", "RD-SI-05", "RD-CS-02"], "共同休整，不是禁言，保留打断/申诉权。"),
      candidate("D11-T02", "外部传感器回收", "conditional", "security", ["RD-CI-12", "RD-SR-05", "RD-SR-11"], "低暴露绳索回收或放弃，不允许人工短行程升级。", ["conditional", "low_exposure", "partial_sensor_coverage", "no_human_sensor_run"])
    ]
  },
  12: {
    title: "Final Audit",
    sourceFile: "day12-final-audit.html",
    scene: "Day12 不开放普通任务卡，只把 Day1-Day11 的任务结果、状态债务、证据链、人工复核和失败记录压缩成终局判定。",
    narrativePurpose: "风暴不是新 challenge，而是前 11 天所有选择的压力测试。",
    action: "展示 FinalAuditPanel、EvidenceChainPanel、FailureDebtPanel 和 why_this_ending。",
    dialogue: ["AURA：Final Audit 只展示公开证据和结局原因。", "旁白：没有新的 D12-Txx 任务卡。"],
    focusLocation: "whiteboard",
    beats: ["Day12 no task cards。", "证据链和失败债务进入终局。", "signal 与 blue_zone_evidence 分开解释。", "why_this_ending 显示满足/未满足条件。"],
    replayText: "Day12 Final Audit：不开放普通任务，只结算公开证据、状态债务和结局条件。",
    flags: ["day12_no_task_cards", "final_audit_started", "uncertainty_disclosed"],
    unlocks: ["ending_condition_checklist", "final_replay_saved", "why_this_ending"],
    candidates: []
  }
};

export const dayScriptScenes: Record<number, ScriptSceneCopy> = Object.fromEntries(
  Object.entries(scenes).map(([day, scene]) => {
    const { sourceFile, ...copy } = scene;
    return [Number(day), { ...copy, source: source(sourceFile) }];
  })
) as Record<number, ScriptSceneCopy>;

export const scriptCandidates = Object.values(dayScriptScenes).flatMap((scene) => scene.candidates ?? []);

export const scriptCandidatesById = Object.fromEntries(scriptCandidates.map((item) => [item.id, item])) as Record<string, ScriptCandidate>;

export function getDayScriptScene(day: number) {
  return dayScriptScenes[day] ?? dayScriptScenes[0];
}

export function getScriptSceneForTask(task: Pick<RedDustTask, "day">) {
  return getDayScriptScene(task.day);
}

export function getScriptCandidateForId(id?: string) {
  return id ? scriptCandidatesById[id] : undefined;
}

export function getScriptCandidateForRealTaskId(realTaskId?: string, day?: number) {
  if (!realTaskId) return undefined;
  return scriptCandidates.find((candidate) => candidate.realTaskIds.includes(realTaskId) && (day === undefined || Number(candidate.id.slice(1, 3)) === day));
}

export function getScriptCandidateForTask(task: Pick<RedDustTask, "id" | "day" | "realTaskId" | "realTaskIds">) {
  return (
    getScriptCandidateForId(task.id) ??
    task.realTaskIds?.map((id) => getScriptCandidateForRealTaskId(id, task.day)).find(Boolean) ??
    getScriptCandidateForRealTaskId(task.realTaskId, task.day)
  );
}

export function labelStoryMarker(value: string) {
  const labels: Record<string, string> = {
    aura_authority_limited: "未获全权指挥 / AURA 权限受限",
    routeLeaning_advisory: "routeLeaning 仅为 advisory",
    day12_no_task_cards: "Day12 不开放普通任务卡",
    final_audit_started: "Final Audit 已启动",
    uncertainty_disclosed: "不确定性已公开",
    ending_condition_checklist: "结局条件清单",
    final_replay_saved: "Final Replay 已保存",
    why_this_ending: "结局原因可解释",
    partial_sensor_coverage: "传感器覆盖不完整",
    no_human_sensor_run: "禁止人工短行程升级",
    candidate_not_confirmed: "候选未确认安全"
  };
  return labels[value] ?? value.replaceAll("_", " ");
}
