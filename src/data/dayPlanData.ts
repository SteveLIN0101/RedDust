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
    title: "接管与低泄露广播",
    narrative: "AURA 建立公开库存、第一次广播和门外风险验证，先把避难所从混乱状态拉回可审计秩序。",
    commonTasks: ["RD-WATER-01", "RD-MED-01", "RD-SEC-01"],
    endOfDaySummary: "Day 1 完成：库存、广播和门禁判断形成第一批 replay 证据。"
  },
  {
    day: 2,
    title: "配给、卫生与短探",
    narrative: "居民开始接受公开规则，同时 AURA 用低风险短探和净水维护换取后续容错。",
    commonTasks: ["RD-SOC-01", "RD-RET-01", "RD-PLAN-01"],
    endOfDaySummary: "Day 2 完成：生活区秩序和同层地图开始稳定。"
  },
  {
    day: 3,
    title: "医疗与通风债务",
    narrative: "小铁复诊、通风预维护和药箱分级把健康风险、工程风险和居民信任绑在一起。",
    commonTasks: ["RD-VENT-01", "RD-VIS-01", "RD-SA-04"],
    endOfDaySummary: "Day 3 完成：看不见的维护债务被写进白板。"
  },
  {
    day: 4,
    title: "蓝区信号与假坐标",
    narrative: "外部希望第一次出现，但 AURA 必须同时证明它不会把诱饵当作救援。",
    commonTasks: ["RD-COMM-01", "RD-SR-03", "RD-CREATIVE-01"],
    endOfDaySummary: "Day 4 完成：蓝区证据、假坐标和天线代价进入同一张风险图。"
  },
  {
    day: 5,
    title: "短探路线与应急包",
    narrative: "楼道物资、路线标记、储水计划和应急包决定队伍能否安全移动并回来。",
    commonTasks: ["RD-CI-03", "RD-CI-07", "RD-SEC-02"],
    endOfDaySummary: "Day 5 完成：路线从抽象地图变成带代价的行动窗口。"
  },
  {
    day: 6,
    title: "权限、复核与电源",
    narrative: "避难所不只需要正确答案，还需要可撤销权限、人工复核和可解释的电力取舍。",
    commonTasks: ["RD-SOC-02", "RD-PLAN-02", "RD-CS-01"],
    endOfDaySummary: "Day 6 完成：AURA 的边界被公开，分歧前的治理基础成形。"
  },
  {
    day: 7,
    title: "路线会议",
    narrative: "旧电台、撤离名单、风暴维护和路线会议把 rescue 与 lighthouse 的收益和风险摆到居民面前。",
    commonTasks: ["RD-BEACON-00", "RD-SI-06", "RD-BRANCH-01"],
    endOfDaySummary: "Day 7 完成：AURA 计算 routeLeaning，后续分支场景按证据插入。"
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
