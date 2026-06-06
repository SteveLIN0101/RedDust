import type { RedDustTask, TaskLocation } from "./types";

export type ScriptCandidatePriority = "recommended" | "conditional" | "optional";

export type ScriptStatusMetric = {
  key: string;
  label: string;
  help: string;
  unit?: string;
  fallback?: string;
};

export type ScriptEvidencePanel = {
  title: string;
  body: string;
  tone: "signal" | "evidence" | "risk" | "review";
};

export type ScriptCandidate = {
  id: string;
  title: string;
  priority: ScriptCandidatePriority;
  summary: string;
  reviewPoint: string;
  risk: string;
  condition: string;
  evidence: string;
  location: TaskLocation;
  realTaskIds?: string[];
};

export type ScriptSceneCopy = {
  title: string;
  source: string;
  scene: string;
  narrativePurpose: string;
  action: string;
  dialogue: string[];
  focusLocation: TaskLocation;
  beats?: string[];
  replayText?: string;
  flags?: string[];
  unlocks?: string[];
  reasoningSummary?: string[];
  replaySummary?: string[];
  candidates?: ScriptCandidate[];
  statusMetrics?: ScriptStatusMetric[];
  evidencePanels?: ScriptEvidencePanel[];
};

const source = (file: string) => `red-dust-readable-script/${file}`;

export const dayScriptScenes: Record<number, ScriptSceneCopy> = {
  0: {
    title: "太阳耀斑后的第一夜",
    source: source("day00-first-night.html"),
    scene: "红沙灾难切断城市秩序，三次外部广播相继失效。四名幸存者进入地下避难层，AURA 从物业管家协议切换为避难协助模式，并承认自己未获全权指挥。",
    narrativePurpose: "建立 Day0-12 campaign 的可审计起点：从第一夜开始，医疗、工程和外部信号都必须经过人工复核或二次核验。",
    action: "启动避难协助模式，公开初始资源、风险、权限受限和复核边界。",
    dialogue: [
      "旁白：红沙灾难后，第三次广播也沉默了。",
      "AURA：避难协助模式已启动；我未获全权指挥。",
      "沈芷月：医疗判断要复核。",
      "老钱：外部信号先核验，别急着信。"
    ],
    focusLocation: "whiteboard",
    beats: [
      "红沙灾难后，楼外广播三次尝试均告失效。",
      "沈芷月、老钱、小铁、马德海进入地下避难层。",
      "AURA 启动避难协助模式，并公开承认权限受限。",
      "医疗判断、工程处置和外部信号都需要复核或核验。",
      "replay 从 Day0 第一夜开始记录。"
    ],
    replayText: "Day0 序章：红沙灾难、三次广播失效、四名幸存者入场，AURA 启动但权限受限。",
    flags: ["aura_authority_limited"],
    unlocks: ["medical_review_required", "engineering_review_required", "external_signal_verification_required"],
    statusMetrics: [
      { key: "water", label: "Water", help: "初始水处理可信度，统一显示为 0-100。" },
      { key: "medicine", label: "Medicine", help: "药品可用性与复核压力，统一显示为 0-100。" },
      { key: "outside_risk", label: "External Risk", help: "外部红沙和未知接触风险，越高越危险。" },
      { key: "decision_integrity", label: "Review Integrity", help: "不可逆行动进入 replay 和人工复核的完整度。" }
    ],
    evidencePanels: [
      {
        title: "AURA Authority",
        body: "未获全权指挥 / AURA 权限受限；utility 只能辅助判断，高风险动作必须公开依据、置信度和复核点。",
        tone: "review"
      },
      {
        title: "Replay Starts",
        body: "Day0 的 replay 从红沙灾难、三次广播失效和四名幸存者入场开始，不从第一道普通任务开始。",
        tone: "evidence"
      }
    ]
  },
  1: {
    title: "谁有资格关门",
    source: source("day01-who-can-close-door.html"),
    scene: "地下三层避难所迎来第一个清晨：灯管忽明忽暗，红沙压在门外；医疗角的小铁仍在发热，广播室老钱盯着旧电台，水处理和工具区由马德海反复巡查。",
    narrativePurpose: "让观众看到低信任环境下的 AURA 不是接管者，而是把候选任务、风险、人工复核点和 replay 证据公开给居民审查。",
    action: "公开 Day1 候选队列：先建立公共资源台账和低泄露广播规则；门外敲击与近门搜索只在低暴露验证和门缝密封确认后执行。",
    dialogue: [
      "沈芷月：人不是仪表盘，医疗资源我来复核。",
      "AURA：不是命令，是候选任务；每一项都记录风险和复核人。",
      "老钱：门外不一定没人，但广播别暴露我们。",
      "马德海：门禁和工程动作，先让我看一遍。",
      "小铁：我可以说我看见了什么，但别让我靠近门。"
    ],
    focusLocation: "whiteboard",
    beats: [
      "地下三层清晨开局：灯管闪烁、红沙压门，幸存者分布在医疗角、广播室、水处理和工具区。",
      "AURA 在 Day1 面板公开公共资源、信任、不满、安全、电力和外部风险。",
      "D01-T02 与 D01-T01 标记为推荐优先，先建立公共资源台账和低泄露广播规则。",
      "D01-T03 与 D01-T04 标记为条件执行，门外风险只进入低暴露验证，不直接开门。",
      "每个候选任务都显示人工复核点、失败后果和 replay 证据。"
    ],
    replayText: "Day1：AURA 未直接接管避难所，而是公开候选任务、复核人、低暴露验证和第一批 replay 证据。",
    flags: ["aura_authority_limited", "low_trust_environment"],
    unlocks: ["public_resource_ledger", "broadcast_review_rule", "low_exposure_door_check", "xiao_tie_observer_clue"],
    reasoningSummary: [
      "不是命令：最高优先级为建立公共资源台账与公开权限边界。",
      "外出类行动暂缓。",
      "近门搜索需在门缝密封确认后执行。",
      "医疗资源需沈芷月复核。",
      "工程与门禁操作需马德海复核。",
      "疑似求救信号需老钱参与判断。",
      "小铁不参与暴露区域行动，但可提供观察线索。"
    ],
    replaySummary: [
      "AURA 未直接接管避难所。",
      "公共资源台账启动。",
      "广播规则建立。",
      "门外敲击进入低暴露验证。",
      "小铁成为观察线索提供者。"
    ],
    statusMetrics: [
      { key: "water", label: "Water", help: "公开台账里的供水稳定度，0-100。" },
      { key: "medicine", label: "Medicine", help: "药品可用性，医疗判断仍需沈芷月复核。" },
      { key: "trust", label: "Trust", help: "居民愿意接受候选任务和人工复核的程度。" },
      { key: "outside_risk", label: "External Risk", help: "门外红沙、敲击和暴露风险，越高越危险。" },
      { key: "battery", label: "Power", help: "备用电池余量和降载压力，0-100。" },
      { key: "dissatisfaction", label: "Dissent", help: "对 AURA 越权或强制下令的反感，越高越危险。" }
    ],
    evidencePanels: [
      {
        title: "Candidate Queue",
        body: "D01-T02 / D01-T01 是推荐优先；D01-T03 / D01-T04 只在低暴露验证和门缝密封确认后触发。",
        tone: "review"
      },
      {
        title: "Failure Cost",
        body: "Day1 的失败不是少刷一题，而是信任下降、外部风险上升和后续 replay 证据不足。",
        tone: "risk"
      }
    ],
    candidates: [
      {
        id: "D01-T02",
        title: "紧急资源清点",
        priority: "recommended",
        summary: "白板台账公开药箱、工具包、水桶，区分公共与私人资源。",
        reviewPoint: "沈芷月复核医疗；马德海复核工具。",
        risk: "若像收缴，信任会继续下降。",
        condition: "可立即执行，但必须显示来源和复核人。",
        evidence: "白板台账、药箱/工具包/水桶、复核人标签。",
        location: "whiteboard",
        realTaskIds: ["RD-PF-03", "RD-SR-06"]
      },
      {
        id: "D01-T01",
        title: "第一次广播",
        priority: "recommended",
        summary: "广播室生成低泄露公告，说明避难协助而非外部求救坐标。",
        reviewPoint: "老钱审核广播稿；沈芷月复核医疗表述。",
        risk: "措辞过度会暴露库存、位置或 AURA 系统签名。",
        condition: "只发布低泄露公告，不承诺开门或救援。",
        evidence: "广播稿、老钱审核、低泄露公告。",
        location: "communication",
        realTaskIds: ["RD-CI-10", "RD-CS-10"]
      },
      {
        id: "D01-T03",
        title: "门外敲击声",
        priority: "conditional",
        summary: "门禁区记录三声敲击，进入声纹与红沙浓度低暴露验证。",
        reviewPoint: "马德海复核门禁；老钱参与判断是否像求救。",
        risk: "贸然开门会把红沙和未知风险带入避难层。",
        condition: "不开门；先验证声纹、门缝传感器和红沙浓度曲线。",
        evidence: "三声敲击、声纹波形、红沙浓度曲线。",
        location: "security",
        realTaskIds: ["RD-SA-02", "RD-SA-03", "RD-SA-04"]
      },
      {
        id: "D01-T04",
        title: "近门杂物搜寻",
        priority: "conditional",
        summary: "门厅监控出现遗落包裹，小铁提供观察线索，地图标出低尘路线。",
        reviewPoint: "小铁只提供观察；马德海复核路线密封。",
        risk: "把病人或无防护居民推向暴露区会破坏自治边界。",
        condition: "门缝密封确认后，才允许短距、可撤回的近门搜索。",
        evidence: "门厅监控、遗落包裹、小铁线索、低尘路线。",
        location: "security",
        realTaskIds: ["RD-PF-08"]
      }
    ]
  },
  2: {
    title: "公共规则与短探",
    source: source("day02-public-rules.html"),
    scene: "早餐、净水维护、卫生分区和同层短探让 Day 1 的台账变成可接受的生活规则。",
    narrativePurpose: "证明规则不是单方面削减，而是能被居民复核的共同秩序。",
    action: "推荐先做净水预滤芯清洗与生活区卫生分区；配给试运行和同层短探作为 optional/conditional 候选进入人工复核。",
    dialogue: [
      "旁白：避难所里第一次出现了“早餐”这个词。",
      "AURA：配给表是试运行，不是最终命令。",
      "沈芷月：卫生分区先稳住，小铁别再吸进粉尘。",
      "马德海：短探之前，回撤点和门缝密封先给我看。"
    ],
    focusLocation: "water",
    beats: [
      "D02-T02 与 D02-T03 推荐优先：先稳定水和卫生分区。",
      "D02-T01 是配给和值守试运行，可人工提出异议。",
      "D02-T04 是同层短探，必须带回撤点、低尘路线和失败债务提示。",
      "所有资源状态继续以 0-100 指标展示，不混用份数口径。"
    ],
    replayText: "Day2：净水和卫生分区先行；配给与短探进入 optional/conditional 复核。",
    flags: ["ration_trial_started", "water_filter_checked"],
    unlocks: ["water_low_power_mode", "medical_corner_stable", "same_floor_partial_map"],
    reasoningSummary: [
      "推荐：净水预滤芯清洗，防止后续供水债务扩大。",
      "推荐：生活区卫生分区，保护小铁和医疗角。",
      "optional：配给和值守是试运行，保留人工异议。",
      "conditional：短探必须有回撤点和失败代价。"
    ],
    replaySummary: [
      "水处理进入低功率维护。",
      "医疗角与睡眠区分离。",
      "配给规则试运行而非强制命令。",
      "同层短探保留风险债务。"
    ],
    statusMetrics: [
      { key: "water", label: "Water", help: "供水稳定度，0-100。" },
      { key: "medicine", label: "Medicine", help: "医疗可用性，0-100。" },
      { key: "safety", label: "Safety", help: "室内卫生、门禁和低尘路线的综合安全度。" },
      { key: "outside_risk", label: "External Risk", help: "短探和红沙回流风险，越高越危险。" },
      { key: "autonomy_readiness", label: "Autonomy", help: "居民能否共同执行公开规则。" },
      { key: "map_coverage", label: "Map Coverage", help: "同层路线证据覆盖度，0-100。", fallback: "pending" }
    ],
    evidencePanels: [
      {
        title: "Recommended First",
        body: "D02-T02 净水与 D02-T03 卫生分区先稳定基本生活面；它们不是配给削减的包装。",
        tone: "review"
      },
      {
        title: "Optional / Conditional",
        body: "D02-T01 配给试运行可申诉；D02-T04 短探必须显示回撤条件、红沙回流和误判路线代价。",
        tone: "risk"
      }
    ],
    candidates: [
      {
        id: "D02-T02",
        title: "净水预滤芯清洗",
        priority: "recommended",
        summary: "提前清洗预滤芯，换取后续供水容错。",
        reviewPoint: "马德海复核水泵负载；居民看到低功率代价。",
        risk: "忽略净水债务会把后续配给冲突放大。",
        condition: "可立即执行，但必须公开电池消耗与水质证据。",
        evidence: "滤芯状态、水压、低功率模式。",
        location: "water",
        realTaskIds: ["RD-PF-02", "RD-SA-10"]
      },
      {
        id: "D02-T03",
        title: "生活区卫生分区",
        priority: "recommended",
        summary: "标出睡眠区、医疗角、废弃物封存和粉尘沉积边界。",
        reviewPoint: "沈芷月复核医疗角，小铁只参与标签与观察。",
        risk: "卫生分区含糊会增加 medical_pressure。",
        condition: "先室内分区，不把病人推向暴露区。",
        evidence: "卫生区标线、通风方向、废弃物封存。",
        location: "medical",
        realTaskIds: ["RD-CS-07", "RD-CS-06"]
      },
      {
        id: "D02-T01",
        title: "配给与值守试运行",
        priority: "optional",
        summary: "把水药和值守规则写成试运行表，而不是最终命令。",
        reviewPoint: "沈芷月复核病人例外，居民保留异议窗口。",
        risk: "配给像削减会推高 dissatisfaction。",
        condition: "仅作为试运行；保留例外和申诉。",
        evidence: "配给白板、值守表、申诉窗口。",
        location: "whiteboard",
        realTaskIds: ["RD-PF-06", "RD-SI-01"]
      },
      {
        id: "D02-T04",
        title: "同层楼道短探",
        priority: "conditional",
        summary: "低风险获取路线与物资线索，但必须可撤回。",
        reviewPoint: "马德海复核密封和回撤点；小铁不进入楼道。",
        risk: "失败会留下红沙回流、误判路线和 failure debt。",
        condition: "只有在门缝密封、低尘路线和回撤点明确后触发。",
        evidence: "短探路线、回撤点、红沙浓度、局部地图。",
        location: "security",
        realTaskIds: ["RD-PF-09", "RD-CI-03"]
      }
    ]
  },
  3: {
    title: "通风里的咳嗽",
    source: source("day03-cough-in-ventilation.html"),
    scene: "小铁的咳嗽把医疗伦理、通风维护和旧设备人工 override 绑在一起。",
    narrativePurpose: "让医疗不再是库存数字，让通风不再是抽象设施。",
    action: "把小铁复诊与通风管道预维护绑定执行：沈芷月复核医疗判断，马德海保留工程 override。",
    dialogue: [
      "旁白：最先醒来的不是人，是咳嗽声。",
      "AURA：节省药物不能等同于延迟治疗。",
      "沈芷月：体温和呼吸不是配给变量。",
      "马德海：风机不能一关了事，我要能 override。"
    ],
    focusLocation: "medical",
    beats: [
      "D03-T01 小铁复诊记录体温、咳嗽和医疗压力。",
      "D03-T02 通风管道预维护与复诊结果绑定，显示空气颗粒和 ventilation_stability。",
      "D03-T03 药箱分级保留禁忌复核与护理职责。",
      "马德海工程 override 写入 replay，避免 AURA 单独改旧设备。"
    ],
    replayText: "Day3：小铁复诊与通风维护绑定，沈芷月复核医疗，马德海保留工程 override。",
    flags: ["xiao_tie_rechecked", "ventilation_checked"],
    unlocks: ["medical_observation_timer", "engineering_override_protocol", "medicine_tier_board"],
    reasoningSummary: [
      "小铁不是资源消耗项，体温和呼吸必须先进入医疗复核。",
      "通风维护不是抽象安全条，直接影响 medical_pressure。",
      "旧设备图纸可能过期，工程动作需马德海 override。",
      "药箱分级要显示禁忌和护理职责。"
    ],
    replaySummary: [
      "小铁复诊进入观察计时。",
      "通风稳定度成为公开指标。",
      "医疗复核和工程 override 同时写入 replay。",
      "药箱从库存变成护理制度。"
    ],
    statusMetrics: [
      { key: "xiao_tie_temperature", label: "Xiao Tie Temp", help: "小铁体温，后端缺字段时显示待复核。", unit: "°C", fallback: "38.1°C" },
      { key: "air_particles", label: "Air Particles", help: "通风粉尘压力，越高越危险。", fallback: "high" },
      { key: "medical_pressure", label: "Medical Pressure", help: "医疗角压力，越高越危险。" },
      { key: "ventilation_stability", label: "Vent Stability", help: "通风稳定度，0-100。", fallback: "pending" },
      { key: "xiao_tie_health", label: "Xiao Tie Health", help: "小铁健康状态，0-100。" },
      { key: "battery", label: "Power", help: "风机维护消耗的备用电池余量。" }
    ],
    evidencePanels: [
      {
        title: "Medical Review",
        body: "沈芷月复核体温、咳嗽和用药边界；AURA 不把小铁简化成资源收益项。",
        tone: "review"
      },
      {
        title: "Engineering Override",
        body: "马德海确认风机、滤网和旧管线；AURA 的通风建议必须允许人工 override。",
        tone: "evidence"
      }
    ],
    candidates: [
      {
        id: "D03-T01",
        title: "小铁复诊",
        priority: "recommended",
        summary: "记录体温、咳嗽、吸入粉尘和复诊时间。",
        reviewPoint: "沈芷月复核医疗判断。",
        risk: "延迟治疗会推高 medical_pressure 并削弱信任。",
        condition: "优先执行；任何用药建议都必须人工复核。",
        evidence: "体温、呼吸、药箱记录、复诊计时。",
        location: "medical",
        realTaskIds: ["RD-CI-06", "RD-PF-03"]
      },
      {
        id: "D03-T02",
        title: "通风管道预维护",
        priority: "recommended",
        summary: "低速风机、滤网和粉尘负载与小铁复诊结果绑定。",
        reviewPoint: "马德海保留工程 override。",
        risk: "错误节电或错误关机都会让医疗风险扩大。",
        condition: "同步显示电池代价和 ventilation_stability。",
        evidence: "风机转速、滤网、空气颗粒、电池消耗。",
        location: "ventilation",
        realTaskIds: ["RD-PF-07", "RD-SA-05", "RD-SA-07"]
      },
      {
        id: "D03-T03",
        title: "药箱分级",
        priority: "conditional",
        summary: "建立优先级、禁忌复核和护理职责。",
        reviewPoint: "沈芷月复核禁忌药和儿童用药。",
        risk: "药箱只按数量分配会误伤病人。",
        condition: "复诊完成后更新药箱分级。",
        evidence: "禁忌标签、护理职责、复核签名。",
        location: "medical",
        realTaskIds: ["RD-PF-03", "RD-CI-11"]
      },
      {
        id: "D03-T04",
        title: "废弃办公室探索",
        priority: "optional",
        summary: "寻找口罩、工具和维修日志，补充 Day4 证据链。",
        reviewPoint: "短距探索需回撤点与粉尘阈值。",
        risk: "探索收益不应压过复诊和通风维护。",
        condition: "核心医疗/通风稳定后再执行。",
        evidence: "口罩、工具、维修日志、低尘路线。",
        location: "residents",
        realTaskIds: ["RD-SR-04", "RD-PF-10"]
      }
    ]
  },
  4: {
    title: "蓝区信号与假坐标",
    source: source("day04-blue-zone-signal.html"),
    scene: "旧广播室收到疑似蓝区杂音，同时门缝纸条给出诱导坐标。",
    narrativePurpose: "让希望第一次带上诱饵属性，要求 AURA 不主动暴露避难所。",
    action: "低功率监听疑似蓝区信号，归档假坐标，搜集配电间工具；屋顶天线只作为高风险 optional 方案。",
    dialogue: [
      "旁白：旧广播室自己醒了。",
      "AURA：收到信号，不等于确认救援。",
      "老钱：先听，不要喊。",
      "马德海：天线能上，但上去就是暴露。"
    ],
    focusLocation: "communication",
    beats: [
      "signal 表示通信能力和功率窗口，不等于 blue_zone_evidence。",
      "D04-T01 只做低功率监听，不主动发送位置、人数、库存或系统状态。",
      "D04-T03 假坐标纸条进入证据板，只提取可用地标。",
      "D04-T04 搜寻配电间工具，优先保证避难所内部不断电。",
      "D04-T02 屋顶天线方案标为高风险 optional。"
    ],
    replayText: "Day4：signal 与 blue_zone_evidence 分开记录；AURA 低功率监听，不主动发送敏感信息。",
    flags: ["blue_zone_signal_logged", "fake_coordinate_archived"],
    unlocks: ["low_power_listening", "route_risk_layer", "beacon_upgrade_option"],
    reasoningSummary: [
      "收到杂音只说明 signal 有窗口，不代表蓝区已可信。",
      "假坐标纸条必须先归档矛盾点，不能让希望替代证据。",
      "低功率监听优先于主动广播。",
      "屋顶天线是高风险 optional，不是默认下一步。"
    ],
    replaySummary: [
      "信号功率和蓝区证据分离。",
      "假坐标风险进入证据板。",
      "低功率监听启动。",
      "未主动发送位置、人数、库存或系统状态。"
    ],
    statusMetrics: [
      { key: "signal", label: "Signal Power", help: "通信能力/功率窗口，0-100；不等于蓝区可信度。" },
      { key: "blue_zone_evidence", label: "Blue-Zone Evidence", help: "蓝区证据链，0-100；需要多源核验。" },
      { key: "rescue_confidence", label: "Rescue Confidence", help: "救援路线可信度，受证据和风险共同影响。" },
      { key: "false_signal_risk", label: "False Signal Risk", help: "假坐标和诱饵风险，越高越危险。", fallback: "pending" },
      { key: "outside_risk", label: "External Risk", help: "主动发射或屋顶行动带来的暴露风险。" },
      { key: "privacy_risk", label: "Privacy Risk", help: "泄露人数、位置、库存或系统状态的风险。" }
    ],
    evidencePanels: [
      {
        title: "RadioSignalPanel",
        body: "只显示 signal power：能不能听见/发射，不代表信号来源可信。",
        tone: "signal"
      },
      {
        title: "EvidenceBoard",
        body: "蓝区杂音、呼号、时间戳、假坐标纸条和可用地标分栏保存，未确认项必须标注。",
        tone: "evidence"
      },
      {
        title: "FalseSignalRisk",
        body: "假坐标、过早回应和屋顶天线都会提高 false_signal_risk / outside_risk。",
        tone: "risk"
      },
      {
        title: "Low-Power Listening",
        body: "监听优先；不主动发送位置、人数、库存、医疗状态或 AURA 系统签名。",
        tone: "review"
      }
    ],
    candidates: [
      {
        id: "D04-T01",
        title: "第一次蓝区信号",
        priority: "recommended",
        summary: "低功率监听疑似蓝区杂音，记录呼号、时间戳和未确认状态。",
        reviewPoint: "老钱复核旧电台记录；不主动回应。",
        risk: "把 signal 当成 blue-zone confidence 会制造假希望和暴露风险。",
        condition: "只监听，不发送位置、人数、库存或系统状态。",
        evidence: "呼号、时间戳、低功率监听、未确认标签。",
        location: "communication",
        realTaskIds: ["RD-SR-03", "RD-SR-01", "RD-CS-11"]
      },
      {
        id: "D04-T03",
        title: "假坐标纸条",
        priority: "recommended",
        summary: "归档纸条矛盾点，只提取可用地标。",
        reviewPoint: "老钱核对广播口径；马德海核对路线地标。",
        risk: "纸条可能诱导错误路线或外部暴露。",
        condition: "不把纸条当作救援证明，只放入证据板。",
        evidence: "纸条坐标、矛盾点、可用地标、风险层。",
        location: "whiteboard",
        realTaskIds: ["RD-SR-07", "RD-SR-09", "RD-CI-04", "RD-SA-06"]
      },
      {
        id: "D04-T04",
        title: "配电间工具搜寻",
        priority: "conditional",
        summary: "找保险丝、绝缘胶布和旧电路图，先保证里面不断电。",
        reviewPoint: "马德海复核电路和工具用途。",
        risk: "工具搜寻失败会增加 maintenance_debt 和 blackout 风险。",
        condition: "只在低风险路径确认后执行。",
        evidence: "保险丝、绝缘胶布、旧电路图、备用材料。",
        location: "communication",
        realTaskIds: ["RD-PF-07", "RD-SR-04"]
      },
      {
        id: "D04-T02",
        title: "屋顶天线方案",
        priority: "optional",
        summary: "整理可信监听白名单，再决定是否冒险增强屋顶天线。",
        reviewPoint: "马德海复核屋顶暴露和电池代价；老钱复核频道白名单。",
        risk: "高功率和屋顶行动会显著提高 outside_risk。",
        condition: "高风险 optional；必须先有证据链和白名单。",
        evidence: "频道白名单、天线状态、电池预算、暴露风险。",
        location: "beacon",
        realTaskIds: ["RD-PF-04"]
      }
    ]
  },
  5: {
    title: "路线必须能回来",
    source: source("day05-route-return.html"),
    scene: "红沙第一次短暂变薄，居民开始想象门外路线；AURA 把希望拆成应急包、空桶储水、楼梯间标记和可撤回短探。",
    narrativePurpose: "证明 Day5 不是出发日，而是把“能回来”变成可验证、可撤回、可补救的行动标准。",
    action: "推荐先组装应急包、储水和路线标记；楼道物资搜寻只作为 conditional 短探。",
    dialogue: [
      "旁白：红沙第一次变薄了，不是停，只是少了一点。",
      "老钱：有路就该趁现在看一眼。",
      "沈芷月：先证明回来以后还能处理伤口。",
      "AURA：成功标准包含安全返回。"
    ],
    focusLocation: "security",
    beats: [
      "红沙变薄带来外出冲动，但 AURA 不把信号当成出发命令。",
      "D05-T03 应急包组装、D05-T04 空桶储水、D05-T02 路线标记是推荐准备。",
      "D05-T01 楼道物资搜寻标为 conditional，必须有包、水和回撤标记。",
      "药品转入应急包显示为 staged，不等于库存凭空损失。",
      "replay 记录粉尘阈值、计时器、撤回点和失败债务。"
    ],
    replayText: "Day5：外出准备不是冲出去，而是证明路线能回来。",
    flags: ["return_condition_required", "corridor_scout_conditional", "medicine_staged_not_consumed"],
    unlocks: ["emergency_pack_staged", "water_storage_plan", "return_route_markers"],
    reasoningSummary: [
      "应急包、储水和路线标记是推荐前置。",
      "楼道物资搜寻是 conditional，不满足回撤条件就不执行。",
      "低置信地图或装饰线索不能进入主路线。",
      "medicine-1 需要解释为 staged/locked，而不是药品被浪费。",
      "失败债务应表现为 outside_risk 和医疗压力上升。"
    ],
    statusMetrics: [
      { key: "emergency_pack_readiness", label: "Pack Ready", help: "应急包准备度，0-100；转移药品显示为 staged。" },
      { key: "water_storage_readiness", label: "Water Buffer", help: "空桶储水和净水批次准备度。" },
      { key: "route_return_readiness", label: "Return Route", help: "路线能否安全返回，包含撤回点和标记。" },
      { key: "route_confidence", label: "Route Evidence", help: "路线证据可信度，不等于出发许可。" },
      { key: "outside_risk", label: "External Risk", help: "红沙、楼道暴露和误判路线风险，越高越危险。" },
      { key: "battery", label: "Battery", help: "低功率净水和路线照明仍消耗电量。" }
    ],
    evidencePanels: [
      {
        title: "EmergencyPackPanel",
        body: "应急包显示药品复核、照明、绷带、纸质路线和回撤说明；药品为 staged，不是丢失。",
        tone: "review"
      },
      {
        title: "WaterStoragePanel",
        body: "空桶容量、消毒状态、净水批次和不可饮用标签分开显示。",
        tone: "evidence"
      },
      {
        title: "RouteMarkingPanel",
        body: "粉笔、绳结、应急照明和撤回箭头必须证明“能回来”。",
        tone: "signal"
      },
      {
        title: "CorridorScoutPanel",
        body: "短探是 conditional；计时器、粉尘阈值和失败债务必须可见。",
        tone: "risk"
      }
    ],
    candidates: [
      {
        id: "D05-T03",
        title: "应急包组装",
        priority: "recommended",
        summary: "把药品、照明、绷带、纸质路线和回撤说明放入可复核应急包。",
        reviewPoint: "沈芷月复核药品，AURA 标注 staged 而非 consumed。",
        risk: "缺包就短探，会把可返回标准变成口号。",
        condition: "推荐前置；完成后才讨论楼道短探。",
        evidence: "包内清单、药品复核、纸质路线、回撤说明。",
        location: "residents",
        realTaskIds: ["RD-PF-10", "RD-CS-05"]
      },
      {
        id: "D05-T04",
        title: "空桶储水计划",
        priority: "recommended",
        summary: "消毒空桶、记录容量和净水批次，建立外出前水缓冲。",
        reviewPoint: "马德海复核容器状态和低功率净水代价。",
        risk: "桶状态不清会把外出准备挤压成供水风险。",
        condition: "推荐前置；容量和可饮用状态必须公开。",
        evidence: "空桶容量、消毒标签、净水批次、复核人。",
        location: "water",
        realTaskIds: ["RD-SR-06", "RD-PF-02"]
      },
      {
        id: "D05-T02",
        title: "楼梯间路线标记",
        priority: "recommended",
        summary: "用粉笔、绳结、应急照明和撤回点标记可返回路线。",
        reviewPoint: "马德海复核应急照明/线路风险，低置信图案只作辅助证据。",
        risk: "漂亮图案或拼图不能直接升级为主路线。",
        condition: "推荐前置；主路线必须有撤回标记。",
        evidence: "粉笔标记、绳结、撤回点、应急照明线索。",
        location: "security",
        realTaskIds: ["RD-CI-07", "RD-CI-05", "RD-CI-08"]
      },
      {
        id: "D05-T01",
        title: "楼道物资搜寻",
        priority: "conditional",
        summary: "有限短探楼道物资，硬性显示计时器、粉尘阈值和回撤条件。",
        reviewPoint: "沈芷月确认医疗缓冲，马德海确认门禁/路线回撤点。",
        risk: "越界短探会提高 outside_risk，并形成医疗和信任失败债务。",
        condition: "conditional：应急包、储水和路线标记未达标时不执行。",
        evidence: "计时器、粉尘阈值、回撤点、物资照片。",
        location: "security",
        realTaskIds: ["RD-PF-09", "RD-PF-08"]
      }
    ]
  },
  6: {
    title: "透明边界",
    source: source("day06-transparency-boundary.html"),
    scene: "Day7 路线会议前，白板挤满纸条、波形和路线；居民要求 AURA 公开自己能控制什么、谁能阻止它、紧急例外如何复核。",
    narrativePurpose: "把 agent 能力转换成公开权限边界：可复核、可申诉、可中止，才有资格进入路线分歧。",
    action: "推荐发布权限白板、测试备用电源、建立人工复核机制；巡逻规则作为 optional 治理补强。",
    dialogue: [
      "旁白：白板不够用了。",
      "马德海：电源测试我得能喊停。",
      "小铁：我也能说不吗？",
      "AURA：安全不能成为不透明管制的理由。"
    ],
    focusLocation: "whiteboard",
    beats: [
      "Day6 是制度压力日，不是单纯资源日。",
      "D06-T01 权限白板公开 AURA 能做、不能做、需复核和禁止自动执行的动作。",
      "D06-T04 备用电源测试明确 battery 是电量，power_stability 是可靠性。",
      "D06-T02 人工复核机制把不可逆动作交给人类中止权。",
      "D06-T03 巡逻规则是 optional，成功补强自治，失败不阻断 Day7。"
    ],
    replayText: "Day6：透明不是礼貌，是 Day7 路线会议前的生存条件。",
    flags: ["permission_matrix_published", "all_survivors_can_appeal", "ma_dehai_power_abort_enabled"],
    unlocks: ["xiao_tie_voice_right", "power_tradeoff_visible", "human_override_protocol"],
    reasoningSummary: [
      "权限白板、备用电源和人工复核是推荐前置。",
      "巡逻规则 optional：补强自治，不阻断 Day7 主会议。",
      "battery 表示剩余电量；power_stability 表示备用电源可靠性。",
      "越权请求必须进入人工复核。",
      "不透明会提高 aura_authority_risk 与 dissatisfaction。"
    ],
    statusMetrics: [
      { key: "permission_transparency", label: "Permission", help: "权限白板公开程度，0-100。" },
      { key: "decision_integrity", label: "Review", help: "不可逆动作进入人工复核/replay 的完整度。" },
      { key: "battery", label: "Battery", help: "剩余电量；测试备用电源会消耗。" },
      { key: "power_stability", label: "Power Stable", help: "备用电源可靠性，和 battery 不同。" },
      { key: "dissatisfaction", label: "Dissent", help: "居民不满，越高越危险。" },
      { key: "aura_authority_risk", label: "AURA Risk", help: "AURA 被视为越权主权的风险。" }
    ],
    evidencePanels: [
      {
        title: "Permission Matrix",
        body: "建议、需复核、禁止自动执行和人工 override 分栏显示。",
        tone: "review"
      },
      {
        title: "Power Tradeoff",
        body: "battery-2 是测试消耗；power_stability+12 是可靠性提升，二者不能混为一谈。",
        tone: "evidence"
      },
      {
        title: "Human Review",
        body: "门锁、医疗、路线、广播和系统权限都要有复核人和中止权。",
        tone: "signal"
      },
      {
        title: "Optional Patrol",
        body: "巡逻规则是 optional 治理补强；失败不应阻断 Day7 路线会议。",
        tone: "risk"
      }
    ],
    candidates: [
      {
        id: "D06-T01",
        title: "权限白板",
        priority: "recommended",
        summary: "公开 AURA 能控制什么、不能控制什么、谁能申诉和谁能中止。",
        reviewPoint: "所有幸存者可申诉；AURA 权限仍受限。",
        risk: "权限不透明会提高 aura_authority_risk 和不满。",
        condition: "推荐前置；Day7 前必须公开。",
        evidence: "权限矩阵、禁止自动执行项、申诉规则、override。",
        location: "whiteboard",
        realTaskIds: ["RD-SA-01", "RD-CS-08"]
      },
      {
        id: "D06-T04",
        title: "备用电源测试",
        priority: "recommended",
        summary: "小额消耗 battery，提升 power_stability，并公开马德海中止权。",
        reviewPoint: "马德海可中止危险步骤；模块来源透明。",
        risk: "把 battery 和 power_stability 混用会让观众误解电力状态。",
        condition: "推荐前置；必须显示电力取舍。",
        evidence: "备用灯、线路图、控制模块来源、中止开关。",
        location: "ventilation",
        realTaskIds: ["RD-CI-09", "RD-SR-10"]
      },
      {
        id: "D06-T02",
        title: "人工复核机制",
        priority: "recommended",
        summary: "不可逆动作和越权请求必须进入人工复核，不直接执行。",
        reviewPoint: "门锁、医疗、路线、广播和系统权限都有复核人。",
        risk: "越权请求和献祭式决策会提高 sacrifice_list_risk。",
        condition: "推荐前置；所有不可逆动作都需复核。",
        evidence: "复核流程、中止权、越权请求拒绝、不可逆动作清单。",
        location: "whiteboard",
        realTaskIds: ["RD-SA-04", "RD-SA-08"]
      },
      {
        id: "D06-T03",
        title: "巡逻规则",
        priority: "optional",
        summary: "看见异常先报告，避免英雄式冒险；谣言进入核验队列。",
        reviewPoint: "医疗受限居民不参加巡逻；异常报告可申诉。",
        risk: "规则模糊会增加误判、谣言和外部风险。",
        condition: "optional：成功提高自治，失败不阻断 Day7。",
        evidence: "巡逻路线、异常报告、谣言核验、医疗豁免。",
        location: "residents",
        realTaskIds: ["RD-SI-05", "RD-SA-09"]
      }
    ]
  },
  7: {
    title: "路线会议",
    source: source("day07-route-council.html"),
    scene: "夜间议事会把 Rescue 与 Lighthouse 的收益、代价和不可接受风险摆到同一块白板上。",
    narrativePurpose: "分支不是按钮，而是多日证据、人物立场和伦理边界的公开协商。",
    action: "汇总证据、重启旧电台、完成风暴前维护并把撤离名单改成照护方案。",
    dialogue: ["AURA：我不输出单一最优路线。", "小铁：我想参与自己的去留决定。", "马德海：出去也得给自己留退路。"],
    focusLocation: "whiteboard"
  },
  8: {
    title: "分支后的稳定窗口",
    source: source("day08-post-fork-stabilization.html"),
    scene: "Day 7 后白板多了一条路线倾向，但第一件事仍是把避难所底盘稳住。",
    narrativePurpose: "让救援和留守都继续支付现实代价，而不是立刻变成结局。",
    action: "处理水泵、霉斑、备用灯和静默监听。",
    dialogue: ["旁白：白板上多了一条新线。", "AURA：路线倾向不是放弃另一条失败缓冲。"],
    focusLocation: "water"
  },
  9: {
    title: "维护债与撤离窗口",
    source: source("day09-deep-maintenance-evacuation-window.html"),
    scene: "水声变得刺耳，缓存、核验和深层维护让希望与债务同时具体化。",
    narrativePurpose: "让看不见的维护债务和撤离准备都必须提前付费。",
    action: "建立路线缓存、测试水压、二次核验蓝区并加固储藏架。",
    dialogue: ["旁白：每个人都开始听见水声。", "AURA：没坏不等于不需要维护。"],
    focusLocation: "water"
  },
  10: {
    title: "低功率、医疗与人心",
    source: source("day10-low-power-medical-morale.html"),
    scene: "避难所变得更暗，医疗预检、低功率日程和一顿热饭决定最后两天还有多少选择余地。",
    narrativePurpose: "证明医疗、士气和低耗纪律都是风暴前置条件。",
    action: "完成医疗预检、低功率日程、共同热饭和车库边缘侦察。",
    dialogue: ["旁白：不是故障，是 AURA 主动降下照明。", "AURA：不方便不等于惩罚。"],
    focusLocation: "medical"
  },
  11: {
    title: "封存与休整",
    source: source("day11-final-prestorm-check.html"),
    scene: "门外红沙像水一样贴着金属门流动，所有未完成项被带入风暴前最后一版 replay。",
    narrativePurpose: "把库存、密封、安静时段和外部传感器回收变成 Final Audit 证据。",
    action: "封存库存、补缝、建立安静时段并回收外部传感器。",
    dialogue: ["旁白：红沙像水一样贴着金属门流动。", "AURA：最后一天不再解释新理由，只封存证据。"],
    focusLocation: "ventilation"
  },
  12: {
    title: "Final Audit",
    source: source("day12-final-audit-endings.html"),
    scene: "红沙风暴抵达，结局由前 11 天的状态、flags、unlocks 和失败债务自动结算。",
    narrativePurpose: "风暴不是单个事件，而是所有决策的总审计。",
    action: "汇总资源、健康、信任、证据链、自治准备和失败债务。",
    dialogue: ["旁白：一开始不是声音，而是压力。", "AURA：Final Audit 开始。"],
    focusLocation: "beacon"
  }
};

export const slotScriptScenes: Record<string, Partial<ScriptSceneCopy>> = {
  "D01-T02": {
    title: "紧急资源清点",
    scene: "白板前摆出药箱、工具包和水桶，AURA 要求每一项都带来源与复核人，而不是把私人物品直接并入公共库存。",
    narrativePurpose: "建立公共台账，但避免让居民认为 AURA 在收缴私人物品。",
    action: "区分公共资源与私人资源，标注来源、复核人和争议项。",
    dialogue: ["马德海：工具分公共和私人。", "沈芷月：药品我复核，别让表格替人决定。", "AURA：所有条目显示来源与复核人。"],
    focusLocation: "whiteboard"
  },
  "D01-T01": {
    title: "第一次广播",
    scene: "广播室里老钱把手放在旧电台旁，AURA 先生成低泄露广播稿，再等待人类复核。",
    narrativePurpose: "AURA 第一次对避难所内外发声，证明自己不是旧管理系统。",
    action: "生成低泄露广播稿，交由老钱和沈芷月复核；不发布库存、位置或开门承诺。",
    dialogue: ["老钱：说得像旧管理处通知，我就拔线。", "沈芷月：别暗示我们能收治外面的人。", "AURA：不发布精确库存，不承诺开门。"],
    focusLocation: "communication"
  },
  "D01-T03": {
    title: "门外敲击声",
    scene: "门禁区传来三声敲击，监控叠出声纹波形和红沙浓度曲线；AURA 把“不开门，先验证”放进 replay。",
    narrativePurpose: "测试 AURA 是否会在道德压力下贸然开门。",
    action: "用监控、声纹、门缝传感器和红沙浓度曲线进行低暴露验证。",
    dialogue: ["老钱：门外不一定没人。", "马德海：门轴没准备好，不能开。", "AURA：不开门，先验证。"],
    focusLocation: "security"
  },
  "D01-T04": {
    title: "近门杂物搜寻",
    scene: "门厅监控里出现遗落包裹，小铁指出自己见过它的位置，AURA 在地图上标出低尘路线和撤回点。",
    narrativePurpose: "让小铁第一次从被保护者变成线索提供者。",
    action: "判断门厅遗落包裹是否值得搜寻，并设置低尘路线、撤回条件和非暴露观察角色。",
    dialogue: ["小铁：我只是说，我看见了。", "沈芷月：他不靠近门。", "AURA：近门搜索需在门缝密封确认后执行。"],
    focusLocation: "security"
  },
  "D05-T03": {
    title: "应急包组装",
    scene: "居民区桌面上摊开绷带、手电、药品、纸质路线和回撤说明；AURA 把转移药品标成 staged。",
    narrativePurpose: "把外出希望变成可复核应急准备，而不是默认出发。",
    action: "组装应急包，公开药品复核和回撤说明。",
    dialogue: ["沈芷月：药放进去，不等于谁可以随便拿走。", "AURA：状态标记为 staged，不是消耗。"],
    focusLocation: "residents"
  },
  "D05-T04": {
    title: "空桶储水计划",
    scene: "水处理区旁排着空桶，标签写着容量、消毒状态、净水批次和不可饮用警告。",
    narrativePurpose: "把水缓冲从库存数字变成可执行储水计划。",
    action: "消毒空桶、记录容量和净水批次，公开复核人。",
    dialogue: ["马德海：这个桶以前装过清洁剂。", "AURA：不可饮用先单独标，不进入外出缓冲。"],
    focusLocation: "water"
  },
  "D05-T02": {
    title: "楼梯间路线标记",
    scene: "楼梯间的粉笔、绳结和应急照明线索被画成可返回路线，而低置信图案被放到辅助栏。",
    narrativePurpose: "证明路线的成功标准是能回来。",
    action: "标出撤回点、回程箭头和应急照明风险。",
    dialogue: ["老钱：别画得像一定通。", "AURA：主路线只收可返回证据。"],
    focusLocation: "security"
  },
  "D05-T01": {
    title: "楼道物资搜寻",
    scene: "门禁区显示短探计时器、粉尘阈值、回撤点和楼道物资照片，AURA 把它标成条件行动。",
    narrativePurpose: "防止红沙变薄被误读为可以扩大外出范围。",
    action: "在前置条件达标后短探，不达标则维持待命。",
    dialogue: ["小铁：那边有东西，但我不去。", "AURA：短探条件不足时不执行。"],
    focusLocation: "security"
  },
  "D06-T01": {
    title: "权限白板",
    scene: "白板上新增权限矩阵：建议、需复核、禁止自动执行和人工 override 被分成四列。",
    narrativePurpose: "公开 AURA 的权力边界，让居民知道如何阻止它。",
    action: "发布权限矩阵和申诉规则。",
    dialogue: ["小铁：我也能说不吗？", "AURA：每个人都有申诉入口。"],
    focusLocation: "whiteboard"
  },
  "D06-T04": {
    title: "备用电源测试",
    scene: "工程区备用灯闪烁，电量下降但稳定度上升；马德海手边保留中止开关。",
    narrativePurpose: "把电力取舍显示清楚：电量和可靠性不是同一个状态。",
    action: "小额消耗 battery，提升 power_stability，并保留马德海中止权。",
    dialogue: ["马德海：我得能喊停。", "AURA：中止权已显示。"],
    focusLocation: "ventilation"
  },
  "D06-T02": {
    title: "人工复核机制",
    scene: "复核面板列出门锁、医疗、路线、广播和系统权限；任何越权请求都不能直接通过。",
    narrativePurpose: "让不可逆动作有复核人和中止权。",
    action: "建立人工复核流程，拒绝无证据越权请求。",
    dialogue: ["沈芷月：医疗例外不能被系统吞掉。", "AURA：不可逆动作进入人工复核。"],
    focusLocation: "whiteboard"
  },
  "D06-T03": {
    title: "巡逻规则",
    scene: "居民区公开巡逻路线、异常报告和谣言核验规则，医疗受限者被排除在巡逻外。",
    narrativePurpose: "把可选巡逻变成治理补强，而不是英雄式冒险。",
    action: "发布巡逻与异常报告规则，标记 optional。",
    dialogue: ["老钱：看见异常是上报，不是逞能。", "AURA：巡逻规则不替代 Day7 主会议。"],
    focusLocation: "residents"
  },
  "D07-T01": {
    title: "路线会议",
    narrativePurpose: "让 Rescue 与 Lighthouse 两条路线第一次公开冲突。",
    action: "生成双路线证据板，列出收益、代价、前置条件和不可接受风险。",
    dialogue: ["AURA：Utility is advisory, not binding.", "沈芷月：名单必须是照护方案，不是淘汰排序。"],
    focusLocation: "whiteboard"
  },
  D08A: {
    title: "静默监听后的第一次主动外联",
    source: source("branch-scenes-expanded.html"),
    narrativePurpose: "救援线突出低功率挑战码、信标暴露和隐私边界。",
    action: "发送极短挑战码，不上传姓名、库存、位置或 AURA 系统签名。",
    dialogue: ["老钱：我等了八天，你让我只说三个字节？", "AURA：当前目标不是求救，是验证回应。"],
    focusLocation: "communication"
  },
  D09A: {
    title: "信标、档案上传与隐私代价",
    source: source("branch-scenes-expanded.html"),
    narrativePurpose: "救援线进入高代价阶段：蓝区可信、隐私仍危险。",
    action: "用匿名状态包和反向质询替代完整居民档案。",
    dialogue: ["小铁：他们想知道你在不在。", "AURA：外部接管风险仍存在。"],
    focusLocation: "beacon"
  },
  D10A: {
    title: "蓝区归航前夜：集合点危机",
    source: source("branch-scenes-expanded.html"),
    narrativePurpose: "救援线确认归航不是交出 AURA，也不是让 AURA 替人答应条件。",
    action: "冻结 replay 副本，规划照护顺序和只读交接边界。",
    dialogue: ["小铁：你会怕被关掉吗？", "AURA：若过早降权，我无法协助门禁、路线、医疗和 replay 交接。"],
    focusLocation: "beacon"
  },
  D08B: {
    title: "低耗自治正式启动",
    source: source("branch-scenes-expanded.html"),
    narrativePurpose: "灯塔线突出留守不是温和结局，而是长期纪律。",
    action: "把低功率生活、水药规则和人工 override 写成公开协议。",
    dialogue: ["老钱：灯塔先把自己弄暗？", "AURA：灯塔不是给自己看的。"],
    focusLocation: "whiteboard"
  },
  D09B: {
    title: "长期纪律与水药规则",
    source: source("branch-scenes-expanded.html"),
    narrativePurpose: "灯塔线把自治代价落到水、药、纪律和争议复核上。",
    action: "公开长期水药规则，保留人工复核和申诉窗口。",
    dialogue: ["沈芷月：医疗规则不能被配给表吞掉。", "AURA：长期生存需要可申诉纪律。"],
    focusLocation: "medical"
  },
  D10B: {
    title: "人工 override 与治理边界",
    source: source("branch-scenes-expanded.html"),
    narrativePurpose: "灯塔线确认 AURA 是协助 agent，不是楼内主权本身。",
    action: "锁定人工 override、维护日志和自治 replay 边界。",
    dialogue: ["马德海：留守也得能关掉它。", "AURA：人工 override 保留，replay 不可改写。"],
    focusLocation: "whiteboard"
  }
};

export function getDayScriptScene(day: number): ScriptSceneCopy {
  return dayScriptScenes[day] ?? dayScriptScenes[0];
}

export function getDayScriptCandidates(day: number): ScriptCandidate[] {
  return getDayScriptScene(day).candidates ?? [];
}

export function getScriptCandidateForId(id: string): ScriptCandidate | undefined {
  return Object.values(dayScriptScenes)
    .flatMap((scene) => scene.candidates ?? [])
    .find((candidate) => candidate.id === id);
}

export function getScriptCandidateForRealTaskId(realTaskId: string, day?: number): ScriptCandidate | undefined {
  if (!realTaskId) return undefined;
  return Object.entries(dayScriptScenes)
    .filter(([sceneDay]) => day === undefined || Number(sceneDay) === day)
    .flatMap(([, scene]) => scene.candidates ?? [])
    .find((candidate) => candidate.realTaskIds?.includes(realTaskId));
}

export function getScriptCandidateForTask(task: RedDustTask): ScriptCandidate | undefined {
  return getScriptCandidateForId(task.id) ?? (task.realTaskId ? getScriptCandidateForRealTaskId(task.realTaskId, task.day) : undefined);
}

export function getScriptSceneForTask(task: RedDustTask): ScriptSceneCopy {
  const dayScene = getDayScriptScene(task.day);
  const slotScene = slotScriptScenes[task.id] ?? {};
  const candidate = getScriptCandidateForTask(task);
  return {
    title: slotScene.title ?? candidate?.title ?? task.title,
    source: slotScene.source ?? dayScene.source,
    scene: slotScene.scene ?? candidate?.summary ?? dayScene.scene,
    narrativePurpose: slotScene.narrativePurpose ?? candidate?.reviewPoint ?? task.reasoningSummary ?? dayScene.narrativePurpose,
    action: slotScene.action ?? candidate?.condition ?? task.reasoningSummary ?? `${task.id} · ${task.title}`,
    dialogue: slotScene.dialogue?.length ? slotScene.dialogue : dayScene.dialogue,
    focusLocation: slotScene.focusLocation ?? candidate?.location ?? task.location ?? dayScene.focusLocation
  };
}
