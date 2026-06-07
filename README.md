# Red Dust / 红尘 MVP Demo

一个可本地运行的 React + Phaser 叙事 benchmark demo。Demo 展示 AURA 在 Red Dust Day0-12 campaign 中自动执行可见任务、移动到对应房间、触发人物互动、更新状态、记录 replay，并在 Day12 进入 Final Audit。

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

## Campaign / Live / Replay

本前端以新版 G 叙事与美术为主线，同时兼容 Red Dust campaign 后端事件流。

常用 URL：

```text
http://127.0.0.1:5176/                         # 本地 demo/autoplay
http://127.0.0.1:5176/?mode=live                # 创建或连接 live campaign
http://127.0.0.1:5176/?mode=live&campaign_id=... # 连接已有 campaign
http://127.0.0.1:5176/?mode=replay&campaign_id=... # 读取 campaign trace
http://127.0.0.1:5176/?mode=replay&trace_url=...   # 读取归档 trace URL
```

后端若提供 `contract_version="reddust_campaign_display_v1"` 和 `display` /
`display_state` / `metric_definitions`，前端优先消费这些展示字段。缺字段时，
前端通过 `src/data/scriptSceneData.ts` 降级展示 Day0-12 readable-script 语义、
`Dxx-Txx -> RD-*` 映射、priority/event_options、Final Audit 条件与状态方向。

主 UI 不展示 raw payload、长 observation 或隐藏思维链；这些内容只应进入 debug
或辅助视图。首屏高价值信息优先级为：日期、具体游戏场景、当前任务、Agent 实际
动作、人物对白、状态值。

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
2. 点击 `Start Agent Run`，AURA 会先展示 Day0 prologue，再从 Day 1 自动推进任务。
3. 使用 `Pause`、`Step`、`Speed x1/x2/x4` 控制自动运行节奏。
4. 左侧避难所舞台会展示 AURA 移动、房间动画、人物互动和任务结果。
5. 右侧 Agent Console 展示当前任务、推理摘要、baseline 参考和下一步。
6. 第 7 天会展示路线会议与 `routeLeaning`，它是 advisory evidence，不是硬锁分支。
7. `Run Both Branches` 可以跑完救援线后回滚到第 7 天，再跑楼内灯塔线。
8. Day12 只进行 Final Audit，不创建普通 `D12-Txx` 任务卡。
9. `Replay`、`Benchmark`、`Credits` 面板用于查看审计轨迹、baseline 表现和素材/项目说明。

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
