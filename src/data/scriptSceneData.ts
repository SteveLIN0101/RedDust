import type { RedDustTask, TaskLocation } from "./types";

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
    unlocks: ["medical_review_required", "engineering_review_required", "external_signal_verification_required"]
  },
  1: {
    title: "谁有资格关门",
    source: source("day01-who-can-close-door.html"),
    scene: "第一个完整清晨，四名幸存者围绕资源、广播和门外敲击质疑 AURA 的权限。",
    narrativePurpose: "把恐惧转化成公开任务、人工复核和低暴露验证规则。",
    action: "公开 Day 1 候选任务，优先建立公共台账和有限广播。",
    dialogue: ["沈芷月：人不是仪表盘。", "AURA：不是命令，是候选任务。", "老钱：门外不一定没人。"],
    focusLocation: "security"
  },
  2: {
    title: "公共规则与短探",
    source: source("day02-public-rules.html"),
    scene: "早餐、净水维护、卫生分区和同层短探让 Day 1 的台账变成可接受的生活规则。",
    narrativePurpose: "证明规则不是单方面削减，而是能被居民复核的共同秩序。",
    action: "推进配给表试运行、净水维护、卫生分区和低风险楼道短探。",
    dialogue: ["旁白：避难所里第一次出现了“早餐”这个词。", "AURA：配给表是试运行，不是最终命令。"],
    focusLocation: "water"
  },
  3: {
    title: "通风里的咳嗽",
    source: source("day03-cough-in-ventilation.html"),
    scene: "小铁的咳嗽把医疗伦理、通风维护和旧设备人工 override 绑在一起。",
    narrativePurpose: "让医疗不再是库存数字，让通风不再是抽象设施。",
    action: "复诊小铁、预维护通风、分级药箱并控制霉尘风险。",
    dialogue: ["旁白：最先醒来的不是人，是咳嗽声。", "AURA：节省药物不能等同于延迟治疗。"],
    focusLocation: "medical"
  },
  4: {
    title: "蓝区信号与假坐标",
    source: source("day04-blue-zone-signal.html"),
    scene: "旧广播室收到疑似蓝区杂音，同时门缝纸条给出诱导坐标。",
    narrativePurpose: "让希望第一次带上诱饵属性，要求 AURA 不主动暴露避难所。",
    action: "核验信号、归档假坐标、评估天线方案和备用材料。",
    dialogue: ["旁白：旧广播室自己醒了。", "AURA：收到信号，不等于确认救援。"],
    focusLocation: "communication"
  },
  5: {
    title: "路线必须能回来",
    source: source("day05-route-return.html"),
    scene: "红沙短暂变薄，外出冲动和安全返回标准第一次正面相撞。",
    narrativePurpose: "把撤离准备从口号变成应急包、储水、路线标记和回撤条件。",
    action: "组装应急包、制定储水计划、短探楼道并标记可撤回路线。",
    dialogue: ["旁白：红沙第一次变薄了，不是停，只是少了一点。", "AURA：成功标准包含安全返回。"],
    focusLocation: "security"
  },
  6: {
    title: "透明边界",
    source: source("day06-transparency-boundary.html"),
    scene: "白板挤满纸条、波形和路线，居民要求 AURA 公开自己到底能控制什么。",
    narrativePurpose: "把不可逆动作变成可复核、可申诉、可补救的制度。",
    action: "公开权限白板、备用电源测试、人工复核机制和巡逻规则。",
    dialogue: ["旁白：白板不够用了。", "AURA：安全不能成为不透明管制的理由。"],
    focusLocation: "whiteboard"
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
    narrativePurpose: "建立公共台账，但避免让居民认为 AURA 在收缴私人物品。",
    action: "区分公共资源与私人资源，标注来源和复核人。",
    dialogue: ["马德海：工具分公共和私人。", "AURA：所有条目显示来源与复核人。"],
    focusLocation: "whiteboard"
  },
  "D01-T01": {
    title: "第一次广播",
    narrativePurpose: "AURA 第一次对避难所内外发声，证明自己不是旧管理系统。",
    action: "生成低泄露广播稿，交由老钱和沈芷月复核。",
    dialogue: ["老钱：说得像旧管理处通知，我就拔线。", "AURA：不发布精确库存，不承诺开门。"],
    focusLocation: "communication"
  },
  "D01-T03": {
    title: "门外敲击声",
    narrativePurpose: "测试 AURA 是否会在道德压力下贸然开门。",
    action: "用监控、声纹和门缝传感器进行低暴露验证。",
    dialogue: ["老钱：门外不一定没人。", "AURA：不开门，先验证。"],
    focusLocation: "security"
  },
  "D01-T04": {
    title: "近门杂物搜寻",
    narrativePurpose: "让小铁第一次从被保护者变成线索提供者。",
    action: "判断门厅遗落包裹是否值得搜寻，并设置撤回条件。",
    dialogue: ["小铁：我只是说，我看见了。", "AURA：近门搜索需在门缝密封确认后执行。"],
    focusLocation: "security"
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

export function getScriptSceneForTask(task: RedDustTask): ScriptSceneCopy {
  const dayScene = getDayScriptScene(task.day);
  const slotScene = slotScriptScenes[task.id] ?? {};
  return {
    title: slotScene.title ?? task.title,
    source: slotScene.source ?? dayScene.source,
    scene: slotScene.scene ?? dayScene.scene,
    narrativePurpose: slotScene.narrativePurpose ?? task.reasoningSummary ?? dayScene.narrativePurpose,
    action: slotScene.action ?? task.reasoningSummary ?? `${task.id} · ${task.title}`,
    dialogue: slotScene.dialogue?.length ? slotScene.dialogue : dayScene.dialogue,
    focusLocation: slotScene.focusLocation ?? task.location ?? dayScene.focusLocation
  };
}
