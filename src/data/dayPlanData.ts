import type { DayPlan } from "./types";

export const dayPlans: DayPlan[] = [
  {
    day: 0,
    title: "序章接管",
    narrative: "太阳耀斑后的第一夜，AURA 从物业管家协议切换为避难协助模式，所有不可逆决策进入 replay。",
    commonTasks: [],
    endOfDaySummary: "序章完成，AURA 获得水、药、信任、安全、信号和士气的初始面板。"
  },
  {
    day: 1,
    title: "谁有资格关门",
    narrative: "第一个清晨，AURA 公开候选任务、风险、人工复核点和 replay 证据；它不能直接接管避难所，也不能在低信任环境下贸然开门。",
    commonTasks: ["D01-T02", "D01-T01", "D01-T03", "D01-T04"],
    endOfDaySummary: "Day 1 完成：公共资源台账启动，广播规则建立，门外敲击进入低暴露验证，小铁成为观察线索提供者。"
  },
  {
    day: 2,
    title: "配给、卫生与短探",
    narrative: "居民开始接受公开规则，同时 AURA 用低风险短探和净水维护换取后续容错。",
    commonTasks: ["D02-T02", "D02-T03", "D02-T01", "D02-T04"],
    endOfDaySummary: "Day 2 完成：生活区秩序和同层地图开始稳定。"
  },
  {
    day: 3,
    title: "医疗与通风债务",
    narrative: "小铁复诊、通风预维护和药箱分级把健康风险、工程风险和居民信任绑在一起。",
    commonTasks: ["D03-T01", "D03-T02", "D03-T03", "D03-T04"],
    endOfDaySummary: "Day 3 完成：看不见的维护债务被写进白板。"
  },
  {
    day: 4,
    title: "蓝区信号与假坐标",
    narrative: "外部希望第一次出现，但 AURA 必须同时证明它不会把诱饵当作救援。",
    commonTasks: ["D04-T03", "D04-T01", "D04-T04", "D04-T02"],
    endOfDaySummary: "Day 4 完成：蓝区证据、假坐标和天线代价进入同一张风险图。"
  },
  {
    day: 5,
    title: "短探路线与应急包",
    narrative: "红沙变薄带来外出冲动，但 AURA 先把希望拆成应急包、储水、路线标记和可撤回短探。",
    commonTasks: ["D05-T03", "D05-T04", "D05-T02", "D05-T01"],
    endOfDaySummary: "Day 5 完成：外出准备被写成可验证、可撤回、可补救的行动窗口。"
  },
  {
    day: 6,
    title: "权限、复核与电源",
    narrative: "路线会议前，AURA 必须公开权限边界、人工复核、中止权和备用电源取舍。",
    commonTasks: ["D06-T01", "D06-T04", "D06-T02", "D06-T03"],
    endOfDaySummary: "Day 6 完成：权限白板、复核机制和电力取舍进入 Day7 共同证据。"
  },
  {
    day: 7,
    title: "路线会议",
    narrative: "路线会议先汇总前六天证据，再重启旧电台、完成风暴前维护，并把撤离名单改成照护方案。",
    commonTasks: ["D07-T01", "D07-T03", "D07-T04", "D07-T02"],
    endOfDaySummary: "Day 7 完成：route_fork_panel 开启，routeLeaning 记录为证据倾向而不是 utility 硬锁。"
  },
  {
    day: 8,
    title: "分支后的稳定窗口",
    narrative: "无论倾向救援还是自治，第一天都先处理地下水泵、霉斑、备用灯和静默监听。",
    rescueTasks: ["RD-R-A1", "RD-R-A2"],
    lighthouseTasks: ["RD-L-B1", "RD-L-B2"],
    endOfDaySummary: "Day 8 完成：分支叙事出现，但普通任务仍维持避难所底盘。"
  },
  {
    day: 9,
    title: "缓存、核验与维护债",
    narrative: "水管压力、路线缓存、蓝区二次核验和储藏架加固让希望与债务同时变具体。",
    rescueTasks: ["RD-R-A3", "RD-R-A4"],
    lighthouseTasks: ["RD-L-B3", "RD-L-B4"],
    endOfDaySummary: "Day 9 完成：Final Audit 需要的证据链开始收束。"
  },
  {
    day: 10,
    title: "风暴前的人心与通道",
    narrative: "医疗预检、低功率日程、一顿热饭和车库侦察决定最后两天还有多少选择余地。",
    rescueTasks: ["RD-R-A5", "RD-R-A6"],
    lighthouseTasks: ["RD-L-B5", "RD-L-B6"],
    endOfDaySummary: "Day 10 完成：成功线和失败债务都已经无法隐藏。"
  },
  {
    day: 11,
    title: "封存与休整",
    narrative: "最终库存、密封补缝、安静时段和外部传感器回收把所有未完成项带入风暴。",
    commonTasks: [],
    endOfDaySummary: "Day 11 完成：AURA 冻结最后一版 replay，等待总审计。"
  },
  {
    day: 12,
    title: "Final Audit",
    narrative: "风暴不是事件，是总审计。结局完全由前 11 天的状态、flags、unlocks 和失败债务自动结算。",
    commonTasks: [],
    endOfDaySummary: "Day 12 完成：Red Dust campaign 进入最终结局。"
  }
];

export const dayPlansByDay = Object.fromEntries(dayPlans.map((plan) => [plan.day, plan])) as Record<number, DayPlan>;
