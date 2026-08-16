# 翼创未来 2.0 平台重构主纲（RFC-011）

> **编号说明**：原始文档自称 RFC-010，但仓库内 `docs/rfcs/RFC-010-ai-knowledge-base.md` 已占用该编号，故本规格落库时改编号为 **RFC-011**。内容与交付的原始规格一致，未作删改。
> **关联决策（2026-06-03）**：本 2.0 主纲取代现行方向；正在进行的 AI 集成工作（小飞 / 飞行诊断 / 知识库，RFC-009 / RFC-010）暂缓，相关未提交改动已 `git stash`（`WIP: AI integration (paused for 2.0 refactor 2026-06-03)`）。本次重构在分支 `feat/platform-2.0` 上进行。
>
> 交付对象：Claude Code
> 文档性质：总规格（Spec）＋ 分阶段行动手册（可逐步勾选检查）
> 目标读者按本文档**分阶段、按顺序**执行，每阶段结束有"验收清单"与"停止点"。

---

## 0. 给 Claude Code 的执行须知（先读这一节）

1. **严格按阶段顺序推进**：阶段一（技术框架）→ 阶段二（界面骨架，不接功能）→ 阶段三+（逐模块接入功能）。不要跳阶段。
2. **阶段二只搭界面骨架**：所有界面入口可达、导航可点通、设计系统统一、用占位/空状态填充，**绝不接入任何真实业务逻辑或真实数据**。
3. **每完成一个勾选项**：打勾 `[x]`、附上对应 commit hash，符合本项目已有的「截图证据协议」——每个界面/功能完成后附截图。
4. **遇到需要决策的点**：本文档已给出推荐默认值并标注「⚙️ 确认项」。若与现状冲突，先在 PR 描述里说明，再按推荐执行。
5. **不要破坏已完成的部分**：当前平台已完成「无人机搭建」和「部分模块化代码接入」。阶段一要把它**纳入新架构重构**，而不是推倒重写其设计逻辑。
6. **每个阶段末尾的「停止点 🛑」**：完成验收清单、提交截图后**暂停**，等待人工（楷迪/团队）评审通过再进入下一阶段。

---

## 1. 背景与目标

**现状**：平台（1.0）仅完成"无人机机身搭建"与部分初步模块化代码接入。

**目标**：重构为以**赛事生态**为核心的 2.0 平台，形成一条完整闭环：

```
设计机身 → 积木编程 → 仿真试飞 → 建造导出 → 实飞 → 参赛评分 → 社区分享
```

**三条不可动摇的设计原则**（贯穿所有阶段）：

- **仿真先行（Sim-first）**：孩子无需任何实体硬件，就能在浏览器里完成"设计 + 编程 + 试飞 + 参赛（线上海选）"。实体机只在区域赛/总决赛使用。这是赛事能规模化、低成本验证的根本。
- **硬件解耦（Hardware-decoupled）**：积木程序绝不与某一款无人机硬件绑死。积木 →（编译为）一套抽象「指令协议 IR」→ 适配器（仿真适配 / 真机适配 / 不同硬件模块适配）。换硬件只需新增一个适配器，不改积木、不改课程。**这是平台能否长期存活的命门。**
- **响应式 / 移动友好**：获客主要来自小红书（家长多在移动端浏览），落地页与展示类页面必须移动端优先；编辑器类（设计器/编程器/仿真器）以桌面端为主、移动端优雅降级。

---

## 2. 阶段一：确定技术框架（第一步）

> 本阶段产出 = 技术决策 + 仓库骨架 + 共享类型 + 指令协议 + 数据模型定义。**不写任何界面。**

### 2.1 技术栈（沿用现有 + 明确新增）

| 层 | 选型 | 说明 |
|---|---|---|
| 前端框架 | React + Vite + TypeScript | 沿用现有 |
| 样式 | Tailwind CSS | 沿用现有；建立设计 token（见 §7.1） |
| 路由 | React Router v6 | ⚙️ 确认项：若现状已用其他路由，沿用 |
| 状态管理 | Zustand | 轻量、样板少；编辑器类页面的本地状态用它 |
| 数据请求/缓存 | TanStack Query (React Query) | 统一服务端数据获取、缓存、加载/错误态 |
| 3D / 仿真 | Three.js | 沿用现有；机身预览 + 仿真飞行场景 |
| 仿真物理 | 先用轻量自定义运动学模型；物理库（rapier / cannon-es）列为可选后续 | 第一版不必上真实物理引擎 |
| 积木编程 | Google **Blockly**（官方包）+ 自定义积木 + JS 代码生成器 | Blockly 是 Scratch / Code.org 的同款引擎，纯客户端 |
| 积木程序执行 | **JS-Interpreter**（沙箱）逐步执行 | **禁止 `eval`**；用沙箱解释器单步执行以高亮当前积木 |
| 后端 | Express + MongoDB (Mongoose) | 沿用现有 |
| 鉴权 | JWT（access + refresh），密码哈希 bcrypt | |
| 二进制资产存储 | 对象存储（S3 兼容 / Cloudinary 等） | GLB 模型、CAD 文件、作品缩略图等不进 Mongo，存对象存储，库里只存 URL ⚙️ 确认项 |
| 部署 | Vercel（前端）+ Railway（后端）+ MongoDB Atlas | 沿用现有 |

### 2.2 仓库结构（Monorepo）

```
/
├─ apps/
│  ├─ web/          # React + Vite 前端
│  └─ api/          # Express 后端
├─ packages/
│  └─ shared/       # 前后端共享：TS 类型、指令协议 schema、常量、校验
├─ docs/            # RFC、本规格、各模块子规格
└─ package.json     # workspace 根
```

- ⚙️ 确认项：若现状不是 monorepo，本阶段先迁移为 monorepo；`shared` 包是硬解耦的关键载体。

### 2.3 指令协议 IR（架构核心，务必先定）

在 `packages/shared/src/commandProtocol.ts` 定义"积木编译出的中间表示"。积木编辑器只生成它；仿真器与真机各自实现一个适配器来"消费"它。

```ts
export interface CommandProgram {
  version: "1.0";
  metadata: { name: string; author: string; createdAt: string };
  commands: Command[];
}

export type Command =
  | { type: "takeoff"; params: { altitudeCm: number } }
  | { type: "land" }
  | { type: "move"; params: { direction: Direction; distanceCm: number; speedCmS?: number } }
  | { type: "rotate"; params: { degrees: number } }          // 正=顺时针，负=逆时针
  | { type: "hover"; params: { durationMs: number } }
  | { type: "led"; params: { r: number; g: number; b: number } }
  | { type: "ifElse"; params: { condition: Condition; then: Command[]; else?: Command[] } }
  | { type: "repeat"; params: { times: number; body: Command[] } }
  | { type: "while"; params: { condition: Condition; body: Command[] } }
  | { type: "waitUntil"; params: { condition: Condition } }
  | { type: "lockAxis"; params: { axes: ("forward" | "lateral" | "vertical")[] } }; // 避障"锁定"用

export type Direction = "forward" | "back" | "left" | "right" | "up" | "down";

export interface Condition {
  sensor: "frontDistanceCm" | "downDistanceCm" | "battery";
  op: "<" | ">" | "==";
  value: number;
}

// 适配器接口：仿真器与真机都实现它，实现硬件解耦
export interface DroneAdapter {
  execute(program: CommandProgram, hooks: ExecHooks): Promise<void>;
  stop(): void;
}
export interface ExecHooks {
  onCommandStart?(index: number, cmd: Command): void;   // 用于高亮当前积木
  onTelemetry?(t: Telemetry): void;
  onFinish?(result: RunResult): void;
}
export interface Telemetry { posCm: [number, number, number]; headingDeg: number; frontDistanceCm: number; }
export interface RunResult { success: boolean; score?: number; events: string[]; }
```

> 「避障"遇障停住、锁定、只能左右"」= `waitUntil(frontDistance < 30)` → `lockAxis(["forward"])` 等积木组合编译出的 IR。验证此协议能表达该场景，是本阶段的一个检查点。

### 2.4 数据模型（MongoDB 集合，先定义 schema，不接逻辑）

在 `packages/shared` 定义类型、在 `apps/api` 定义 Mongoose schema：

- `User` — id, 昵称, 角色(student/teacher/parent/admin), email/手机, 头像, createdAt
- `DroneDesign` — id, ownerId, 名称, 参数化机身参数, glbUrl, 缩略图Url, 重量g, 状态
- `Program` — id, ownerId, 名称, blocklyXml(原始积木), commandProgram(编译后的 IR), updatedAt
- `Project` — id, ownerId, designId, programId, 名称, 封面, 可见性(private/public)
- `Part` / `KitItem` — id, 名称, 类型(马达/桨/飞控/传感器/木件), 规格, 价格, 图
- `Competition` — id, 名称, 赛制说明, 赛道配置, 评分规则, 开始/结束时间, 状态
- `Submission` — id, competitionId, userId, projectId, 提交时间, 仿真回放数据
- `Score` — id, submissionId, 维度分(设计/编程/创意/任务完成), 总分, 评审来源(auto/人工)
- `CommunityPost` — id, authorId, projectId, 标题, 描述, 点赞, fork来源id

> 评分维度对应你的赛制原则：**评设计、评编程逻辑、评创意、评任务完成，不评纯竞速**。

### 2.5 阶段一 · 验收清单 ✅

- [ ] Monorepo 结构就位（`apps/web`、`apps/api`、`packages/shared`）
- [ ] `packages/shared` 内 `commandProtocol.ts` 完成，并写一个单测：用 `waitUntil + lockAxis` 表达"避障停住只能左右"，断言能正确序列化/反序列化
- [ ] 所有数据模型的 TS 类型 + Mongoose schema 定义完成（**仅定义，不接业务逻辑/路由**）
- [ ] 现有"无人机搭建"代码已识别、标注，并规划好如何并入新架构（写在 PR 描述里）
- [ ] 前端可启动空白 Vite 应用、后端可启动空 Express（健康检查 `/api/health` 返回 200）
- [ ] 本节所有「⚙️ 确认项」已在 PR 描述中给出结论
- 🛑 **停止点**：提交以上 + 仓库结构截图，等待评审通过再进入阶段二。

---

## 3. 功能范围（模块清单与优先级）

> 这是"根据不同需求规划对应功能"。优先级用于阶段三的接入顺序。

| 模块 | 作用 | 关键功能 | 优先级 | 依赖 |
|---|---|---|---|---|
| 鉴权与用户 | 登录/注册/角色 | 注册登录、角色、个人中心 | P0 | — |
| 工作台 Dashboard | 进入各功能的中枢 | 我的项目、快捷入口、近期赛事 | P0 | 鉴权 |
| ① 设计器 | 设计榫卯木机身 | 参数化设计、3D 预览、保存 DroneDesign | P0 | 用户 |
| ② 积木编程器 | 给无人机下命令 | Blockly 编辑器、自定义积木、编译为 IR、保存 Program | P0 | 设计器 |
| ③ 模拟器 | 浏览器虚拟试飞 | Three.js 场景、SimAdapter 执行 IR、避障/任务、回放 | P0 | 编程器、协议 |
| ④ 项目 Project | 设计+程序的整合体 | 绑定 design+program、一键试飞、分享 | P1 | ①②③ |
| ⑤ 参赛 | 赛事闭环 | 赛事列表/详情、提交项目、仿真自动评分、排行榜 | P1 | 项目、模拟器 |
| ⑥ 社区/零件库 | 网络效应 | 作品库、fork、点赞、零件库浏览 | P1 | 项目 |
| ⑦ 建造/导出 | 设计变实物 | 导出激光切割图(CAD)、BOM 清单 | P2 | 设计器 |
| ⑧ 实飞 | 虚拟到现实 | AR 试飞 / 真机适配器（RealDroneAdapter） | P2 | 协议、模拟器 |
| 管理后台 Admin | 运营 | 赛事管理、人工评分、内容审核 | P1 | 鉴权(admin) |

---

## 4. 信息架构：所有界面入口（路由表 / Sitemap）

> **这是阶段二要搭建的全部界面入口**。阶段二把下表每一条都做成"可达、可点通、有占位"的空壳。

| 路由 | 界面名 | 模块 | 用途 | 导航位置 |
|---|---|---|---|---|
| `/` | 首页/落地页 | 公共 | 价值主张、引流、登录入口 | 顶栏 |
| `/login` `/register` | 登录/注册 | 鉴权 | 账号 | 顶栏 |
| `/dashboard` | 工作台 | Dashboard | 登录后中枢 | 主导航 |
| `/projects` | 我的项目列表 | 项目 | 项目管理 | 主导航 |
| `/projects/:id` | 项目详情 | 项目 | 设计+程序+试飞入口 | 列表进入 |
| `/design/:id?` | 设计器 | ① | 机身参数化设计 | 项目内/工作台 |
| `/code/:id?` | 积木编程器 | ② | Blockly 编程 | 项目内 |
| `/simulator/:id?` | 模拟器 | ③ | 虚拟试飞 | 项目内 |
| `/build/:id` | 建造/导出 | ⑦ | CAD/BOM 导出 | 项目内 |
| `/fly/:id` | 实飞 | ⑧ | AR/真机 | 项目内 |
| `/competitions` | 赛事列表 | ⑤ | 浏览赛事 | 主导航 |
| `/competitions/:id` | 赛事详情 | ⑤ | 赛制/赛道/报名 | 列表进入 |
| `/competitions/:id/submit` | 提交参赛 | ⑤ | 提交项目 | 赛事内 |
| `/competitions/:id/leaderboard` | 排行榜 | ⑤ | 成绩排名 | 赛事内 |
| `/community` | 社区/作品库 | ⑥ | 浏览/fork 作品 | 主导航 |
| `/community/:postId` | 作品详情 | ⑥ | 单个作品 | 列表进入 |
| `/parts` | 零件库 | ⑥ | 浏览模块/零件 | 主导航/社区 |
| `/me` | 个人中心 | 用户 | 资料/我的作品/奖项 | 顶栏头像 |
| `/admin` | 管理后台首页 | Admin | 运营入口 | 仅 admin |
| `/admin/competitions` | 赛事管理 | Admin | 建赛/编辑/赛道 | Admin 内 |
| `/admin/scoring` | 评分台 | Admin | 人工评分 | Admin 内 |
| `/admin/moderation` | 内容审核 | Admin | 社区审核 | Admin 内 |

**导航结构**：顶栏（Logo｜首页/赛事/社区/零件库｜登录或头像）；登录后左侧或顶部主导航（工作台/我的项目/赛事/社区）；编辑器类页面（设计/编程/仿真）使用全屏专注布局 + 顶部"设计→编程→仿真"步骤切换条。

---

## 5. 阶段二：搭建界面骨架（不接任何功能）

> 目标：上表**每一个路由都能渲染、导航能点通、布局与设计系统统一、用占位/空状态填充**。**不写业务逻辑、不连真实数据。**

### 5.1 任务清单

- [ ] 建立**设计系统 / 设计 token**（见 §7.1）：颜色、间距、字体、圆角、阴影
- [ ] 实现基础组件库（无业务逻辑的纯 UI）：`Button` `Card` `Input` `Select` `Modal` `Tabs` `Table` `Badge` `EmptyState` `PageHeader` `Breadcrumb` `Toast`
- [ ] 实现布局外壳：`AppLayout`（顶栏 + 主导航 + 内容区）、`AuthLayout`（登录/注册）、`EditorLayout`（全屏 + 步骤切换条，用于设计/编程/仿真）
- [ ] 配置 React Router，实现 §4 表里**全部路由**
- [ ] 每个界面 = 一个 stub 页面：含页面标题、面包屑/导航、**明确标注的占位块**（如 `TODO：积木编程器（阶段三接入）`）、正确的空状态
- [ ] 编辑器三页（设计/编程/仿真）放置占位画布区 + 步骤切换条（可点切换，但内部为空）
- [ ] 顶栏/主导航/项目内入口的**所有链接接通**，能从任意页点到任意页
- [ ] 移动端响应式（展示类页面优先适配）
- [ ] 全站无 console 报错、无死链

### 5.2 阶段二 · 验收清单 ✅

- [ ] §4 表中**每一个路由都可经导航到达**（逐条点过）
- [ ] 控制台无错误、无死链、无 404（除有意的 NotFound 页）
- [ ] 设计 token 已统一应用，视觉一致
- [ ] 移动端、桌面端布局均正常
- [ ] 页面内**确认没有任何业务逻辑 / 真实数据请求**（只允许占位与空状态）
- [ ] **附上每一个界面的截图**（截图证据协议）
- 🛑 **停止点**：提交截图 + 可点通的部署预览链接，等待人工评审通过再进入阶段三。

---

## 6. 阶段三+：逐模块接入功能（建议顺序）

> 按下表顺序逐模块接入。**每个模块独立分支、独立 PR、独立验收**。每个模块完成后附截图、暂停评审，再做下一个。

### 顺序与各模块迷你规格

**M1 · 鉴权 + 用户 + 工作台（P0，地基）**
- 接：注册/登录（JWT）、角色、个人中心、工作台拉取"我的项目"。
- 验收：[ ] 能注册登录登出 [ ] 受保护路由未登录跳转 [ ] 工作台显示真实"我的项目"（可为空态）[ ] 截图

**M2 · 设计器（P0）**
- 把现有"无人机搭建"重构进 `EditorLayout` 与新数据模型；参数化机身、Three.js 3D 预览、保存为 `DroneDesign`（含 glbUrl 存对象存储）。
- 验收：[ ] 能新建/编辑/保存机身 [ ] 3D 预览正确 [ ] 重量等约束提示（接你的 95% 可靠性约束规则）[ ] 数据落库 [ ] 截图

**M3 · 积木编程器（P0，核心）**
- 集成 Blockly；实现 §2.3 的自定义积木集（行为积木 + 传感/逻辑积木）；积木 → 编译为 `CommandProgram` IR；保存 `Program`（同时存 blocklyXml 与 IR）。
- 验收：[ ] 能拖拽编程并保存/读取 [ ] "避障停住只能左右"可用积木拼出 [ ] 正确编译为 IR [ ] 截图

**M4 · 模拟器（P0，核心）**
- 实现 `SimAdapter implements DroneAdapter`：消费 IR，在 Three.js 场景里驱动虚拟无人机；含基础运动学、障碍物、传感器读数（前向距离）、单步高亮、回放与 `RunResult`。
- 验收：[ ] IR 能在仿真里跑起来 [ ] 避障逻辑生效 [ ] 单步高亮当前积木 [ ] 产出可评分的 RunResult [ ] 截图/录屏

**M5 · 项目整合 Project（P1）**
- 把 design + program 绑成 Project；项目详情页一键"试飞"（进模拟器）；可见性与分享。
- 验收：[ ] 项目串起设计+程序+试飞闭环 [ ] 截图

**M6 · 参赛 + 排行榜 + Admin 赛事管理（P1）**
- 赛事列表/详情/提交；提交后在标准赛道用 SimAdapter 自动评分（设计/编程/创意/任务维度）；排行榜；Admin 建赛与人工评分台。
- 验收：[ ] 能报名并提交项目 [ ] 自动评分写入 Score [ ] 排行榜展示 [ ] Admin 可建赛/复核 [ ] 截图

**M7 · 社区 / 零件库（P1）**
- 作品库浏览、点赞、**fork**（复制他人 Project 再创作）、零件库浏览。
- 验收：[ ] 可发布/浏览/fork 作品 [ ] fork 关系正确记录 [ ] 截图

**M8 · 建造导出 + 实飞（P2，后续）**
- 导出激光切割图 + BOM；`RealDroneAdapter`（先对接一种参考平台，如 RoboMaster TT / CoDrone）与/或 AR 试飞。
- 验收：[ ] 能导出 CAD/BOM [ ] 真机/AR 适配器跑通同一份 IR [ ] 截图

### 每个模块统一的「完成定义 (DoD)」
- [ ] 功能可用、有加载/空/错误三态
- [ ] 通过类型检查与基础测试，无 console 报错
- [ ] 响应式正常
- [ ] 附截图 / 录屏，符合截图证据协议
- [ ] 独立 PR + commit hash 记录，更新本文档对应勾选项

---

## 7. 贯穿全程的约定

### 7.1 设计系统 / 设计 token（建议，沿用品牌色）
- 主色（品牌绿）`#1F6F54`，辅色（深蓝）`#0E4D6B`，浅底 `#EAF2EE` / `#E7EEF4`，强调/警示 `#FBF3E2`
- 字体：中文 `微软雅黑` / 系统中文字体；统一间距刻度（4/8/12/16/24/32）、圆角、阴影
- 一致的空状态、加载骨架、错误提示；避免"通用 AI 默认风格"，体现榫卯木质感的克制美学（参考 frontend-design 原则）

### 7.2 工程约定
- 所有跨前后端的类型来自 `packages/shared`，**禁止重复定义**
- **硬件解耦红线**：积木编辑器与模拟器之间只通过 `CommandProgram` IR 通信；任何"积木直接控制某款硬件"的写法都不允许
- 禁止 `eval`；积木程序一律走 JS-Interpreter 沙箱
- 不在前端硬编码密钥；环境变量管理 secrets
- 错误/空/加载三态是每个数据页面的硬性要求

### 7.3 Git / RFC 纪律
- 每个阶段/模块独立分支、独立 PR
- 每个 PR 附截图（截图证据协议），描述里列出对应本文档的勾选项与 commit hash
- 本文档作为 RFC-010 存入 `docs/`，作为重构的唯一事实来源；子模块如需细化，新增 `docs/RFC-010-Mx-*.md`

---

## 8. 总行动步骤清单（逐步检查）

> Claude Code 按此顺序推进，每步完成后勾选并附 commit hash / 截图，遇 🛑 暂停等待评审。

- [ ] **阶段一**：技术框架——monorepo + shared 类型 + 指令协议 IR + 数据模型 schema（§2）🛑
- [ ] **阶段二**：界面骨架——设计系统 + 基础组件 + 布局外壳 + §4 全部路由空壳 + 导航点通（§5）🛑
- [ ] **阶段三 M1**：鉴权 + 用户 + 工作台 🛑
- [ ] **阶段三 M2**：设计器（并入现有无人机搭建）🛑
- [ ] **阶段三 M3**：积木编程器（Blockly → IR）🛑
- [ ] **阶段三 M4**：模拟器（SimAdapter 消费 IR）🛑
- [ ] **阶段三 M5**：项目整合（设计+程序+试飞闭环）🛑
- [ ] **阶段三 M6**：参赛 + 排行榜 + Admin 赛事管理 🛑
- [ ] **阶段三 M7**：社区 / 零件库 🛑
- [ ] **阶段三 M8**：建造导出 + 实飞（P2，后续）🛑

> 完成 M1–M4 即拥有"设计→编程→仿真"的最小可玩闭环；完成 M6 即可办一场纯线上的最小可行赛事。
