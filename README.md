# Red Dust / 红尘 MVP Demo

一个可本地运行的 React + Phaser 叙事 benchmark demo。前端保留原有动画、视觉和本地 autoplay 演示，同时可连接后端 Day0-12 剧本化 campaign：AURA 在末世废土避难所中执行真实 `RD-*` 任务、移动到对应房间、触发人物互动、更新状态、记录 replay，并在 Day12 Final Audit 自动结算结局。

## 快速开始

环境要求：

- Node.js `>=20.19.0`，推荐 Node 22
- npm `>=10`

```bash
git clone <your-repo-url>
cd red-dust-mvp-demo
npm ci
npm run dev
```

浏览器打开终端显示的本地地址。默认配置为：

```text
http://127.0.0.1:5176/
```

如果 `5176` 被占用，Vite 会提示新的可用端口，按终端输出为准。

## 常用命令

```bash
npm run dev        # 启动本地开发服务器
npm run typecheck  # TypeScript 类型检查
npm run build      # 生产构建，输出到 dist/
npm run preview    # 预览生产构建
npm run clean      # 删除 dist/ 和 TypeScript 构建缓存
```

团队成员首次运行建议使用 `npm ci`，它会严格按照 `package-lock.json` 安装依赖，避免版本漂移。

## Demo 操作

1. 打开首页，点击 `Start Demo`。
2. 点击 `Start Agent Run`，AURA 会从 Day0/Day1 自动推进本地演示任务。
3. 使用 `Pause`、`Step`、`Speed x1/x2/x4` 控制自动运行节奏。
4. 左侧避难所舞台会展示 AURA 移动、房间动画、人物互动和任务结果。
5. 右侧 Agent Console 展示当前任务、推理摘要、baseline 参考和下一步。
6. 本地 demo 在第 7 天打开 route fork panel：显示 rescue/lighthouse 证据倾向、不可接受条件和 counterfactual route，不把 utility 当作强制命令。
7. `Run Both Windows` 可以跑完救援执行窗口后回滚到第 7 天，再跑楼内灯塔反事实窗口。
8. `Replay`、`Benchmark`、`Credits` 面板用于查看审计轨迹、baseline 表现和素材/项目说明。

## Campaign 后端双模式

前端现在支持两种连接真实 campaign 后端的模式，仍保留本地 demo 模式。真实 campaign 默认使用 `story_version=red_dust_readable_v1`：Day0 序章、Day1-11 普通任务槽、Day8-10 分支场景事件、Day12 Final Audit。

### Live Agent Mode

1. 启动 campaign 后端：

```bash
cd /Users/steve/Documents/2026Spring/Agent_Game
PYTHONPATH=. /Users/steve/miniconda3/envs/agent_game/bin/python scripts/run_reddust_lan_server.py --port 7001
```

2. 启动前端：

```bash
cd /Users/steve/Documents/2026Spring/Agent_Game/RedDust
npm run dev
```

3. 打开前端，点击 `Live Agent Mode`。前端会创建一个等待开始的 campaign，并显示 agent prompt。
4. 把 prompt 发给 Claude Code、OpenClaw 或 MiniMax agent；agent 调用 `/connect` 后，前端会弹出连接成功提示。
5. 点击 `Start Agent Run`。之后前端不再使用本地 demo resolver，而是跟随后端 `/campaigns/{id}/events` 推进，包括 `story_event`、`branch_scene`、`final_audit` 和普通任务事件。

也可以用 URL 直接进入：

```text
http://127.0.0.1:5176/?mode=live&api=http://127.0.0.1:7001
```

如果使用本仓库 OpenClaw runner 连接前端创建的 campaign：

```bash
PYTHONPATH=. /Users/steve/miniconda3/envs/agent_game/bin/python scripts/run_reddust_campaign_agent.py \
  --base-url http://127.0.0.1:7001 \
  --campaign-id rdcamp-... \
  --connect-agent \
  --wait-for-start
```

### Replay Mode

Replay 可读取已完成 campaign 的 trace，不需要重新跑 agent。

```text
http://127.0.0.1:5176/?mode=replay&api=http://127.0.0.1:7001&campaign_id=rdcamp-...
```

或直接传 trace URL：

```text
http://127.0.0.1:5176/?mode=replay&trace_url=http://127.0.0.1:7001/campaigns/rdcamp-.../trace
```

Replay 支持自动播放、暂停、Step、Back、Speed x1/x2/x4，以及跳转到指定 Day。服务重启后，只要 `runs/reddust_campaigns/<campaign_id>/campaign.json` 还在，后端会以只读方式提供 trace/report。

## 前端展示契约

- Campaign 展示优先消费后端事件：`story_event`、`task_started`、`action_executed`、`slot_completed`、`branch_scene`、`final_audit`、`campaign_complete`。
- Day0 是序章/cutscene，不作为普通 benchmark task 渲染；后端 `D00` 的 `title`、`text`、`beats`、`replay_text`、`flags`、`unlocks` 优先于本地 fallback。
- 本地剧情 fallback 在 `src/data/scriptSceneData.ts`，只用于后端字段缺失或未连接真实 campaign 时补足 Day0-12 场景、对白和位置焦点；Day0-Day8 还提供候选任务、证据面板和状态量纲兜底。
- Day7 是共通线 route fork panel：前端展示 `D07-T01/D07-T03/D07-T04` 推荐槽位和 `D07-T02` optional-but-critical 槽位，显示 `routeLeaning` 作为证据倾向而非硬锁分支。
- Day8 是 route fork 后的稳定窗口：前端展示 `D08-T04/D08-T02/D08-T01` 为三项前台推荐任务，`D08-T03` 标为黄昏 background/listening window。
- `RD-*` 技术任务 ID 只保留在 metadata/benchmark 详情中；主任务面板优先显示 `Dxx-Txx` 剧情行动、场景对白、AURA/居民对话或旁白。
- 主游戏 shell 首屏优先保留日期、场景、当前任务、Agent 动作、人物对白和核心状态；连接 prompt、长 trace、replay feed 与辅助 console 可折叠或进入局部/页面下方滚动区。
- Day timeline 固定展示 Day0-12 和 Ending 共 14 项，一行内完成；移动端只保留紧凑标记，不横向滚动。

## 当前视觉内容

运行中的 Phaser 舞台使用 `public/assets/generated/image2/` 下的 bitmap 素材：

- 无嵌入人物的 2D / 2.5D 像素风避难所背景
- AURA idle / thinking / moving / executing 状态图
- 四个剧情人物：马德海、沈知月、小铁、老钱
- 小铁卧床生病状态
- 马德海维修互动、沈知月医疗互动、老钱电台/白板互动状态
- 独立风扇转子 PNG，运行时旋转
- 尘埃、柔和灯光、水流/波纹、风扇、信标、控制台闪烁等环境动画

旧 SVG 生成素材仍保留在 `public/assets/generated/` 中，主要用于 UI、图标、装饰和可回溯资产来源。当前舞台不再渲染旧房间框、旧模块覆盖层或匿名居民素材。

## 项目结构

```text
red-dust-mvp-demo/
  public/
    assets/                 # 运行时静态素材
    assets/generated/       # 生成素材，包含 image2 bitmap 与 SVG
  scripts/
    generate-pixel-assets.mjs
  src/
    components/             # React UI 面板
    data/                   # 任务、剧情、指标、素材注册
    game/                   # Phaser 场景与事件总线
    styles/                 # 全局样式
    App.tsx
    main.tsx
  index.html
  package.json
  package-lock.json
  vite.config.ts
  tsconfig.json
```

## Git 上传范围

在 `Agent_Game` 父项目中，当前目录是 `RedDust/` submodule；不要在该目录里重新 `git init`。如果单独 fork/维护 RedDust，使用已有子仓库 remote：`origin=https://github.com/SteveLIN0101/RedDust.git`，`upstream=https://github.com/peter-cui-yi/RedDust.git`。

应该提交：

- `src/`
- `public/`
- `scripts/`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `tsconfig.json`
- `.gitignore`
- `.nvmrc`
- `README.md`

不要提交：

- `node_modules/`
- `dist/`
- `*.tsbuildinfo`
- `.env*`
- 本地日志、压缩包、临时目录

这些已经在 `.gitignore` 中配置好。上传前可以检查：

```bash
git status --short
```

如果要把当前目录作为一个独立 Git 仓库上传：

```bash
cd red-dust-mvp-demo
git init
git add .
git commit -m "Initial Red Dust MVP demo"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 重新生成 SVG 素材

SVG 资产生成脚本是可选工具，不是运行 demo 的前置步骤：

```bash
node scripts/generate-pixel-assets.mjs
```

注意：当前 `image2` bitmap 背景、AURA、人物状态和风扇 PNG 是运行时核心素材，已经提交在 `public/assets/generated/image2/` 下。团队成员 clone 后不需要重新生成图片。

## 验证

提交或交付前至少跑：

```bash
npm ci
npm run build
```

当前已验证通过：

```text
npm run build
```

## 常见问题

### Node 版本过低

Vite 7 要求 Node `^20.19.0 || >=22.12.0`。如果启动失败，先升级 Node，或使用 nvm：

```bash
nvm install
nvm use
```

### 不能直接双击 HTML 打开

不要用 `file://` 直接打开 `index.html`。Vite 构建后的资源路径需要 HTTP 服务，请使用：

```bash
npm run dev
```

或：

```bash
npm run build
npm run preview
```

### 端口被占用

默认端口是 `5176`。如果端口被占用，Vite 会自动提示另一个本地地址，直接打开终端输出的地址即可。
