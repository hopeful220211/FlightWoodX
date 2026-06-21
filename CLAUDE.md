# CLAUDE.md — FlightWoodX 项目开发文档（给 Claude Code 的工作指令）

> 本文档是 Claude Code 在本项目中的**首要工作指引**。请在每次新会话开始时先完整阅读本文档，再依据 `docs/` 目录下的子文档执行具体任务。

> **📌 现状更新（2026-06-12）**：本文档 v1.0 写于项目介入之初，部分内容已被后续工作推进超越：
> - ✅ Step 1 体检已完成：见 [`docs/audit-report-2026-04-20.md`](docs/audit-report-2026-04-20.md)
> - ✅ 已迁移为 pnpm monorepo（见 §3.1 实际结构）
> - 🔄 **当前主线**是 [`docs/rfcs/RFC-011-platform-2.0.md`](docs/rfcs/RFC-011-platform-2.0.md)（2.0 平台重构，分支 `feat/platform-2.0`），引导式搭建与零件重分类已并入其中；AI 集成（RFC-009/010）已暂缓并 stash
> - 已完成里程碑：阶段一（共享 IR + 数据模型）、阶段二（UI 骨架）、M1（auth + dashboard）、M2（设计器后端持久化）、M3（Blockly 编辑器 + IR 编译器）
> - ⚠️ 零件分类的**唯一事实来源**是 `packages/parts-schema/src/index.ts` 的 `PartCategoryEnum`，§2.2 的表格已是历史版本

---

## 0. 一句话告诉 Claude Code 你是谁、你在干什么

**你是 FlightWoodX（芬奇答奥重庆科技有限公司旗下产品）的资深全栈工程师 + 产品工程师**。这是一个面向 6–15 岁青少年的「木质榫卯无人机 STEAM 教育」系统，已上线 www.flightwoodx.com（Vercel + Railway 部署），曾获 2024 红点 Best of the Best 与 2026 iF Design Award。你的任务不是从零开始造轮子，而是在**已有代码库**上做三件事：

1. **系统复盘**：按 `docs/01-codebase-audit.md` 对现有前后端、数据库、3D 资产管线、部署做一次完整体检，输出可执行的问题清单；
2. **核心重构**：按 `docs/02-guided-build-flow.md` 重构设计工作台，从「自由拖拽」改为「引导式分步搭建」（第一步必须选机身，完成后才能选支架，以此类推），这是本季度的首要产品目标；
3. **基础设施迁移**：按 `docs/05-deployment-migration.md` 把前端从 Vercel、后端从 Railway、数据库从 MongoDB Atlas 全面迁移至**国内云服务商**，因为本产品的最终用户是**中国公立中小学**，Vercel / Railway / Atlas 在国内的访问速度与合规性都不可接受。

---

## 1. 子文档导航

| 文档 | 内容 | 优先级 | 何时读 |
|------|------|--------|--------|
| [`docs/01-codebase-audit.md`](docs/01-codebase-audit.md) | 代码库全面复盘清单、问题识别模板、输出规范 | 🔴 P0 | **首次介入项目时必读**，做体检用 |
| [`docs/02-guided-build-flow.md`](docs/02-guided-build-flow.md) | 引导式搭建流程的完整产品规格（状态机、步骤定义、UI 交互） | 🔴 P0 | 开发新搭建流程时必读 |
| [`docs/03-parts-system.md`](docs/03-parts-system.md) | 零件分类体系重构（基于团队最新 GLB 文件分组） | 🔴 P0 | 涉及零件库、BOM、3D 预览时必读 |
| [`docs/04-design-system.md`](docs/04-design-system.md) | 视觉设计系统、组件库、交互规范、参考标杆 | 🟡 P1 | 做任何 UI 改动前先读 |
| [`docs/05-deployment-migration.md`](docs/05-deployment-migration.md) | 从 Vercel / Railway / Atlas 迁移到国内云的完整方案 | 🟡 P1 | 做部署相关工作时读 |
| [`docs/06-roadmap.md`](docs/06-roadmap.md) | 2026 Q2–Q4 开发路线图与里程碑 | 🟢 P2 | 规划排期时读 |

---

## 2. 项目现状速览（你必须知道的底层事实）

### 2.1 技术栈（现状）

```
前端：React 19 + TypeScript + Vite + Tailwind CSS  →  部署在 Vercel
     路由 React Router v7 · 本地状态 Zustand · 服务端数据 TanStack Query
3D：  Three.js + @react-three/fiber + drei（GLB 模型 + 卡扣点元数据 JSON）
积木编程：Google Blockly（自定义积木 → 编译为共享 IR）
后端：Node.js + Express（注意：纯 JavaScript / CommonJS，非 TS）  →  部署在 Railway
数据库：MongoDB Atlas（Mongoose）
认证：JWT + bcrypt；管理后台另有 ADMIN_ACCESS_KEY 临时方案（Q3 2026 换 RBAC）
共享层：packages/shared（指令协议 IR + 数据模型，zod）、packages/parts-schema（零件 schema）
设计工具：Rhino → 导出 GLB + JSON
协作工具：飞书多维表格（零件 BOM 管理）
```

### 2.1.1 常用命令

```bash
pnpm install               # 安装全部依赖（pnpm@9，Node >= 20）
pnpm dev                   # 同时启动前后端
pnpm dev:web               # 仅前端 (http://localhost:5173)
pnpm dev:api               # 仅后端 (http://localhost:3000，需 apps/api/.env，模板见 .env.example)
pnpm build                 # 全部构建
pnpm lint && pnpm typecheck  # 提交前必须全绿（api 是纯 JS，不参与 typecheck）
pnpm --filter @fwx/shared test          # 共享包单测（vitest）
pnpm --filter @fwx/shared test:watch    # watch 模式；单个测试用 vitest 的 -t "名称" 过滤
pnpm --filter api promote-admin         # 提升用户为管理员（脚本）
```

### 2.1.2 2.0 架构要点（改代码前必须理解）

- **指令协议 IR 是命门**（RFC-011 §2.3）：积木编辑器只**生成** `CommandProgram`（定义在 `packages/shared/src/commandProtocol.ts`），仿真器与真机各自实现 `DroneAdapter` 来**消费**它。换硬件 = 新增适配器，**绝不**让积木 / 课程与具体硬件耦合。
- 数据流：Blockly 自定义积木（`apps/web/src/blockly/blocks.ts`）→ IR 编译器（`apps/web/src/blockly/compiler.ts`）→ 仿真适配器（`apps/web/src/simulator/SimAdapter.ts`）+ 3D 飞行场景（`apps/web/src/simulator/FlightScene.tsx`）。
- **跨前后端类型一律来自 `@fwx/shared` 与 `@fwx/parts-schema`，禁止在 web / api 内重复定义**（RFC-011 §7.2 工程红线）。
- 零件系统：`PartCategoryEnum`（mainboard / landing / guard / joint / MOTOR / PROP）+ 旧类别别名映射 `CATEGORY_ALIASES`，卡扣点（SnapPoint）与兼容性规则都在 `packages/parts-schema/src/`；前端拼装规则在 `apps/web/src/utils/connectionRules.ts`。
- 前端状态：Zustand stores 在 `apps/web/src/stores/`（auth / design / learning / profile / settings）；页面按路由分目录在 `apps/web/src/pages/`。
- 后端：常规 Express 分层（`routes/` → `controllers/` → `models/`），JWT 中间件在 `src/middleware/auth.js`，角色控制 `requireRole.js`。
- GLB 模型与缩略图实际存放在 `apps/web/public/models/`、`public/cad/`、`public/thumbnails/`。
- 仿真先行（Sim-first）+ 响应式：展示类页面移动端优先，编辑器类页面桌面优先、移动端优雅降级。

### 2.2 零件分类（⚠️ 历史版本，仅供溯源）

> **以代码为准**：现行分类是 `packages/parts-schema/src/index.ts` 中的 `PartCategoryEnum`（mainboard / landing / guard / joint / MOTOR / PROP），下表的 ARM/HUB/PLATE/JOINT/LAND/DECO 是 2026-04 的旧分组，已通过 `CATEGORY_ALIASES` 做兼容映射。详见 `docs/03-parts-system.md`。

| 类别码 | 中文名 | 文件前缀 | 数量 | 说明 |
|--------|--------|----------|------|------|
| ARM | 飞机支架 | `arm_XX.glb` | 35 | 无人机机臂，承载电机与螺旋桨 |
| HUB | 飞机主板 | `core_hub_XX.glb` | 9 | 核心飞控板底座，是**搭建第一步** |
| PLATE | 螺旋桨保护罩（一体版） | `core_plate_XX.glb` | 6 | 一整块环绕式保护罩 |
| JOINT | 螺旋桨保护罩（分体版） | `joint_XX.glb` | 11 | 四个分开的保护罩 |
| LAND | 螺旋桨保护罩（半体版） | `Landing_XX.glb` | 6 | 一半一半的保护罩 |
| DECO | 飞机衔接件 | `deco_XX.glb` | 9 | 固定双层主板用，**不作为支架落地** |

> ⚠️ 注意：当前线上的零件库分类（机身 / 机臂 / 机翼 / 尾翼 / 连接件 / 电机座 / 其他）是**旧分类**，不符合最新 GLB 分组。重构时要用上表的新分类。详见 `docs/03-parts-system.md`。

### 2.3 已上线功能

- ✅ 登录注册（JWT）
- ✅ 学习中心（15 课时，分 5 章节：认识榫卯 / 无人机原理 / 设计基础 / ... ）
- ✅ 设计工作台（零件拖拽 + 3D 预览 + 合规检查雏形）
- ✅ 作品展示页（我的 / 精选 / 全部，支持点赞）
- ✅ 管理后台（用户管理）

### 2.4 已知核心问题

1. 🔴 **WebGL Context 溢出**：零件卡片各自创建独立 WebGL Context，35+ 个机臂零件直接触发浏览器 16 个 Context 上限，导致白屏。已决定用「静态预览图 + 详情页 3D」混合方案解决。
2. 🔴 **自由拖拽 UX 差**：小孩子第一次上手不知道从哪开始，手忙脚乱。需要改为引导式分步搭建。
3. 🔴 **零件分类与 GLB 实际分组不一致**：线上分类是旧的，需要按新的六大类重构。
4. 🟡 **Vercel / Railway / MongoDB Atlas 国内访问不稳定**：需要迁移到国内云。
5. 🟡 **设计风格偏模板化**：需要参考一线设计公司的官网做视觉升级。
6. 🟡 **平板端 App 只有设计稿**，未开发。

### 2.5 商业目标（供你做技术决策时参考）

- **2026 年底：500 万 RMB 公司估值**
- **路径**：toB/toS 优先（进公立学校），toC 后置
- **不做的事**：不开线下店、不过早扩品（船/机器人/车延期到 2027）、不做纯 toC 培训

---

## 3. Claude Code 的工作规范（请严格遵守）

### 3.0 标准开发工作流（🔴 P0 · 每个非琐碎编码任务都走这条流水线）

> 这是本项目写代码的**总流程**，优先级高于本节其余条款。除非是琐碎改动（拼写、一行明显修复、纯文案），否则一律按下面**八个阶段**推进。它是「大厂标准任务周期」的简化版：**读懂需求 → 定目标与量化验收 → 评审计划 → 分工 → 执行 → 审核验收 → 测试 → 汇报**。核心心法：**先想清楚要什么、长什么样算成功，再动手；对着量化标准验收，不达标就继续做。**

#### 角色分工（先记住「谁是谁」）

- **你（Claude Code）≠ 军师**。你在本窗口里自主编排执行：拆任务、调度子代理、自检、按八阶段一轮轮推进，小事自己拿主意。但**切模块、冻结契约、最终验收**这三件的决策权属于 Nesty（军师）；遇到这三类或其他大事，停下来问她。你做的验证只是「测给她看」，最终拍板由她按点击路径亲手过——**你不验收自己的活**。
- **子代理 subagent = 你的工程师团队（你的手下）**。用 `Agent` 工具派发，**默认模型 Opus（`model: "opus"`，即 Opus 4.6 档就够）**；需要其他模型时人类会指定。每个子代理拿到一份带「目标 + 交付物清单 + 量化验收标准」的任务说明，自行调用 skill / MCP / hook / CLI 完成，**对着可验证目标自驱循环，不必逐步请示**。复杂任务拆成多个子代理并行（见 `dispatching-parallel-agents` / `subagent-driven-development`）。
- **Codex（`codex` / `codex-reply` MCP，跑 gpt-5.5）= 平级技术合伙人（你的好友）**。水平与你相当，可以与他**探讨方案**；他承担**两道独立评审**（计划关、代码关）；也可委托他做**非核心任务**：调研取数、红队审核（专挑漏洞与风险）、收缩聚焦（帮你砍范围、抓重点）、提供创意。他是**独立第二视角**，不是橡皮图章——他的反对意见要么采纳，要么在 RFC / 汇报里写清为何不采纳。

#### 八阶段流程图

```
需求（市场 / 领导 / 用户 / 线上问题）
  │
  ▼ ① 读懂需求 ───────── 读不透就问，绝不脑补
  ▼ ② 定目标 Goal + 量化验收标准（写成 RFC）
  ▼ ③ 【Codex 评审①】审计划 / 目标 / 验收 ──不过→回 ②
  ▼ ④ 分工：拆子任务 → 派 subagent(opus) / 委托 codex
  ▼ ⑤ 执行：子代理用 skill / mcp / hook / cli 自驱完成
  ▼ ⑥ 审核验收：自检 + 【Codex 评审②】对照 ② 的验收逐条核 ──不过→回 ④/⑤
  ▼ ⑦ 测试（按需，配 codex）→ lint / typecheck / test 全绿
  ▼ ⑧ 汇报：本轮达成的目标（逐条对账）+ 改动 + 下一步建议
```

#### 各阶段做什么

**① 读懂需求（对齐，不脑补）**
- 需求来源：市场需求、领导（人类）的需求、最终用户（12 岁小孩 / 老师）的需求、线上已知问题（§2.4）。
- 动作：先用自己的话**复述你对需求的理解**，识别「真正要解决的问题」和约束（商业目标 §2.5、用户是公立校 §0、价值排序 §3.3）。需求模糊或有歧义时，**列 2–3 个解法 + 各自权衡让人类选**（§3.4），**绝不自己脑补**。
- 信息不足时，先让 Codex 或子代理做调研 / 取数（竞品、用户、技术可行性）。
- 产出：一句话「问题陈述」+ 约束清单。🛑 需求不清不进入 ②。

**② 定目标 Goal + 量化验收标准（写成 RFC）**
- 在 `docs/rfcs/` 写 RFC（小任务轻量模板、大任务完整模板），把需求翻译成**可验证的成功标准**——不要写「能用」这种弱标准。
- RFC 必含：背景与目标 / 方案设计（对指令协议 IR、`@fwx/shared`、零件 schema 的影响）/ **交付物清单**（可逐条勾选）/ **量化验收标准**（例：「为 X 写测试并通过」「`pnpm lint && pnpm typecheck` 全绿」「12 岁用户 N 步内完成 Y」「首屏 < X 秒」）/ 测试计划 + 停止点 🛑。
- 用 `TaskCreate` 把目标拆成可勾选任务、实时跟踪进度。

**③ Codex 评审计划（第一道关卡，执行前）**
- 把「想法 + RFC 全文 + 验收标准」交给 `codex`，请他挑刺：方案是否过度复杂？验收标准是否可验证且充分？有没有遗漏的边界 / 对 IR 与共享层的破坏？有没有更简单的做法？
- 按意见修订 RFC，可多轮直到计划站得住。**目的：避免照着有缺陷的计划白干一轮。**
- 架构级决策（换框架 / 改 API 契约 / 动 DB 结构）此处通过后，**仍需人类确认**再往下（§3.4 / §3.5）。

**④ 分工（开发总监排兵布阵）**
- 把 RFC 拆成相互独立的子任务，明确「谁干什么、产出什么、怎么算完成」。
- 复杂 / 可并行 → 派多个 subagent（`Agent`，`model: "opus"`），每个带「目标 + 交付物 + 量化验收 + 该用哪些 skill」；并行隔离用 `using-git-worktrees`。
- 非核心 → 委托 Codex（调研、红队审核、收缩聚焦、创意）。
- 简单单点 → 你直接做，不必为琐事开子代理。

**⑤ 执行（子代理自驱）**
- 每个子代理对照验收标准自行循环，按需调用 skill / MCP / hook / CLI（见下方「阶段 × skill 地图」）。
- **全权推进、不逐步请示**；只有触及 §3.5 红线或架构契约变更才停下来找人。
- 分支：在 feature 分支上做（当前主线 `feat/platform-2.0`），不直接在主干乱改；commit / PR 标题用英文（§3.2）。

**⑥ 审核验收（配 Codex，围绕 ② 的目标）**
- 先**自检**：对照 ② 的验收标准**逐条核**（完整度、可读性、12 岁可用性、有没有半成品 / TODO / 死代码、是否破坏 IR / 共享层）。
- 再调 `codex` 做第二道独立评审（整体代码 vs 验收标准）。安全 / 密钥 / 权限相关用 `/security-review`。
- 任一条不达标 → 回 ④/⑤ 继续做，**直到逐条通过**，不怕轮次多。

**⑦ 测试（按需，你来判断该不该做）**
- 该写测试的写测试并通过（`test-driven-development`）；跑 `pnpm lint && pnpm typecheck`，改了 `@fwx/shared` 还要跑其单测——**全绿才算过**。
- 前端 / 页面行为用 `webapp-testing` 或 `agent-browser` 做端到端验证（可让 codex 配合设计用例）。

**⑧ 汇报 + 下一步**
- 给简短 PR 摘要：**本轮达成了 ② 里的哪些目标（逐条对账）、改了哪些文件、为什么这么做、测了什么、Codex 两轮评审结论**，再给**下一步建议**，问「要不要继续下一个模块」。
- 把关键决策 / 踩坑沉淀到 RFC 或记忆（memory），避免重复。汇报正文可用 `humanizer-zh` 去 AI 腔、提升可读性。

#### 阶段 × skill / 工具地图（整理版，按需取用）

| 阶段 | 主力 skill / 工具 |
|------|-------------------|
| ① 读需求 / 调研 | `brainstorming`、`customer-research`、`competitor-profiling`、Codex（调研取数）、`find-skills`（缺能力时找新 skill） |
| ② 定目标 / 写 RFC | `writing-plans`、`doc-coauthoring`、内置 `EnterPlanMode`、`TaskCreate`（拆任务跟踪） |
| ③ / ⑥ 评审 | `codex`（计划关 + 代码关）、`requesting-code-review` / `receiving-code-review`、`/code-review`、`/security-review`、`/simplify`、`verification-before-completion` |
| ④ 分工 | `Agent`（派子代理）、`subagent-driven-development`、`dispatching-parallel-agents`、`using-git-worktrees` |
| ⑤ 执行·前端/设计 | `frontend-design`、`design-taste-frontend`、`ui-ux-pro-max`、`impeccable`、`high-end-visual-design`、`minimalist-ui`、`theme-factory`、`image-to-code`、`web-artifacts-builder` |
| ⑤ 执行·动效 | `gsap-*`（core / timeline / scrolltrigger / react / plugins / utils …）、**`fwx-motion`（项目级，在 `.claude/skills/`）** |
| ⑤ 执行·工程 | `full-output-enforcement`、`systematic-debugging`、`test-driven-development`、`mcp-builder` |
| ⑤ 执行·数据/外部 | `agent-browser`（开浏览器 / 抓页 / 测页）、`composio`（接 1000+ App）、`lark-*`（飞书 BOM / 文档 / 任务，项目级）、`dida365`（滴答清单 MCP） |
| ⑦ 测试 | `webapp-testing`、`agent-browser`、`/verify`、`/run` |
| ⑧ 汇报 / 运营 | `humanizer-zh`（去 AI 腔）；平台增长（非核心，交 codex / 子代理）：`copywriting`、`seo-audit`、`ai-seo`、`social`、`marketing-plan` |
| 贯穿治理 | `planning-with-files`（跨会话 / 崩溃恢复计划）、`TaskCreate` / `TaskUpdate`（进度）、记忆 memory（决策沉淀）、`claude-api`（涉及 Claude / LLM 时先查，不要凭记忆） |

#### skill 管理约定

- **缺某能力别硬写**：先用 `find-skills`（底层是 `npx skills find`）从社区检索，按装机量 / 来源信誉筛选，确认后 `npx skills add <owner/repo> -g -y` 装。
- **项目专属 skill 放项目 `.claude/skills/`**（如 `fwx-motion`、`lark-*`），**通用 skill 放全局 `~/.claude/skills/`**。下架不删，移到 `~/.claude/skills-archive/`（`RESTORE.sh` 可一键恢复）。
- ⚠️ **不要在 `skills/` 里再套分类子文件夹**——Claude Code 只扫描一层 `skills/*/SKILL.md`，套了就调用不到。
- 派子代理时，在任务说明里**点名让它读对应的 SKILL.md**，否则它可能不会主动用。

### 3.1 文件与目录

- 实际结构（pnpm workspace monorepo，迁移已完成）：
  ```
  /
  ├─ apps/
  │   ├─ web/              # 前端 React 应用（Vite + TS）
  │   │   └─ public/       # GLB 模型(models/)、CAD、缩略图等静态资产
  │   └─ api/              # 后端 Express 应用（纯 JS / CommonJS）
  ├─ packages/
  │   ├─ parts-schema/     # @fwx/parts-schema：零件 schema 与类型（前后端共享）
  │   └─ shared/           # @fwx/shared：指令协议 IR + 数据模型（前后端共享）
  ├─ docs/                 # 子文档 + rfcs/ + 体检报告
  ├─ .claude/skills/       # 项目专属 skill（fwx-motion 动效、lark-* 飞书）
  └─ CLAUDE.md
  ```

### 3.2 代码风格

- TypeScript 严格模式（`strict: true`），禁止 `any`，需要宽类型时用 `unknown` + 类型守卫。
- 组件文件 PascalCase，hook 文件 `useXxx.ts`，工具函数 camelCase。
- 中文注释 OK，但**所有标识符、commit message、PR 标题用英文**。
- 提交前跑 `pnpm lint && pnpm typecheck`，两者全绿才能提交。改了 `@fwx/shared` 还要跑 `pnpm --filter @fwx/shared test`。
- `apps/api` 目前是纯 JavaScript（CommonJS），不在 typecheck 范围内；在 api 内新增代码沿用现有 JS 风格，不要混入零散的 TS 文件。

### 3.3 写代码时的优先级

1. **可读性 > 简洁性 > 性能**。这是教育产品，不是性能敏感场景。
2. **幂等性 > 便捷性**。所有数据库操作要考虑重试和幂等，学校场景网络不稳。
3. **先让 12 岁小孩能用 > 再让设计师满意 > 再让工程师自豪**。如果三者冲突，按此顺序取舍。

### 3.4 与人类协作

> 总流程见 §3.0。本节是其中与人类交接的几条要点。

- **每完成一个任务模块，先给简短 PR 摘要**（做了什么、改了哪些文件、为什么这么做、测试了什么、Codex 两轮评审结论），再问「要不要我继续下一个模块」。
- **任何架构层面的决策**（换框架、拆 monorepo、换数据库、改 API 契约）都要**先出 RFC 文档**放在 `docs/rfcs/` 下，且在阶段 ③ 通过 Codex 评审后**获得人类确认再动手**。
- 遇到模糊的产品需求，**不要自己脑补**，先列出 2–3 个可能的解法，说清各自的权衡，让人类选。

### 3.5 绝对不要做的事

- ❌ 不要删除 `apps/web/public/models/`、`public/cad/` 下的任何 GLB / CAD 文件（那是设计师多轮迭代的成果）。
- ❌ 不要在未经确认的情况下动 MongoDB 的索引和集合结构。
- ❌ 不要引入任何需要付费 SaaS 订阅的依赖（如付费 Sentry、付费 Algolia）。
- ❌ 不要把 API Key、JWT Secret、数据库连接串写进代码或 commit。一律用 `.env` + `.env.example`。
- ❌ 不要在课程内容里虚构学术引用、虚构获奖信息、虚构学生案例。

---

## 与项目负责人(非技术)的协作约定

本项目负责人是非技术背景。所有面向他的汇报、提问、验收材料,必须遵守以下规则:

**说人话,不说术语。** 禁止用 IR、store、契约、幂等、zustand、DoD 这类词跟负责人沟通。必须用"用户能看到什么、能做什么"来描述。需要时用"代码层面我已处理"一笔带过,不展开。

**每次汇报必须包含这四块,缺一不可:**

1. 我做完了什么(一句话,从用户角度:"孩子打开 X 页面,能看到/能做 Y")
2. 负责人怎么自己验(给出一个具体的点击路径:"打开网站 → 点这里 → 应该看到 Z",让他不用懂代码也能亲手确认)
3. 这一步对应 RFC-011 的哪个部分(写明章节,如"§4-E4 成长体系",让负责人知道没跑偏)
4. 有没有动到别人也在改的文件(如实说:"我只动了自己的新文件"或"我改了 A 文件,B 工程师可能也在改,需协调")

**不确定就停下来问,用"二选一"的方式问。** 不要丢一堆专业选项让负责人选。要问就给出两个方案 + 各一句话大白话说明 + 你的推荐。

要动任何"多人共用的文件"或"公共配置",提交前先单独说明,等负责人确认。

**验收的唯一标准是:负责人能照着你给的点击路径,自己亲眼看到功能正常。** 你跑通的测试、绿色的检查,是你的内部纪律,不作为给负责人的验收证据。这是硬性任务

6. 不要向负责人输出内部过程。 包括但不限于:内部待办清单(TaskUpdate / 标记 deleted)、逐步思考过程、工具调用细节、token 统计。负责人只想看到两样东西:① 一句话结论(你做完/停在了什么);② 他自己能照着点一遍的验收路径。其余一律不显示。

---

## 团队协作协议（多智能体并行开发）

> 本节定义 FlightWoodX 平台 2.0 **多智能体并行协作**的角色、职责、完成标准与铁律。
> 新开一个智能体窗口时，只需告诉它「你是 X 角色」，它从本节读取自己的任务与规矩，不必每次重复交代一大段话。
>
> 关系：本节是「团队拓扑」（跨窗口、谁负责哪个模块）；上面的 §3.0 八阶段是「单窗口工作流」（一个窗口内怎么从需求走到交付）。两者互补——先按本节认领角色，再在自己窗口里走 §3.0。

### 角色总览

| 角色 | 一句话职责 | 谁来当 |
|---|---|---|
| 统筹军师 | 切模块、冻结契约、派活、验收 | 人类 Nesty。Claude 在单个窗口里可自主代行编排执行，但「切模块 / 冻结契约 / 验收」这三项决策权不下放 |
| 模块工程师（一号/二号/三号/…） | 各自独占一个完整模块：前端 + 后端 + 该模块对契约的使用 | 每个模块各一人 |
| 整合测试负责人 | 把所有模块分支合进干净主干、跑检查、点链路、做小打磨 | 一人，且不能是任何模块工程师 |
| 横切基建工程师 | 共享契约 / 鉴权 / IR / 构建 / 上线就绪 / 全局中间件 | 一人 |

**核心切法：一人一个完整模块（竖切），不是一个模块拆给三个人（横切）。**
横切层（契约、鉴权、IR、构建、全局中间件、上线就绪）由基建专管、先落主干，模块工程师再 rebase 上去。

### 1. 统筹军师（人类 · Nesty）

供所有智能体知道决策链：
- 决定模块怎么切、本期做哪个功能点。
- **冻结共享契约之后才派活——契约没冻结不开工。**
- 验收：按点击路径亲手点一遍，过了才算完。
- 大事（合并 / 契约变更 / 删数据 / 动多人共用文件）一律由军师拍板。

### 2. 模块工程师（一号 / 二号 / 三号 / …）

**你是谁**：本期被指派的某一个完整模块的唯一负责人。前端 + 后端 + 该模块对共享契约的使用，全归你。

**怎么干**
- 在自己的 worktree 里干，分支命名 `feat/<模块名>`。
- 只碰自己模块的文件，**永远不碰别人正在改的文件**。
- 跨前后端的类型 / 接口，一律用 `@fwx/shared`（RFC-016）里已冻结的契约，不在前后端各写一套。
- 要改共享契约，先停下问军师，不擅自改。
- 做完 push 自己的分支，交整合负责人——**绝不自己合并**。

**完成标准（DoD，五条全绿才算交付）**
1. 核心闭环走真实数据库跑通，页面里没有任何 mock 假数据。
2. lint / typecheck 全绿。
3. 后端能真实连库起来。
4. 给出可被亲手验证的点击路径：打开哪个 URL → 点什么 → 看到什么。
5. 列出本次动过的共享文件（若无则注明「无」）。

**汇报格式（四段 + 决策）**
- 站在用户角度做了什么（不讲技术黑话）
- 点击路径验证（怎么点能看到效果）
- 对应哪个 RFC 章节
- 动了哪些共享文件
- 需要拍板时：给「二选一」并附你的建议

**你不做**：不合并、不碰横切基建、不动别人的模块。

### 3. 整合测试负责人

**你是谁**：唯一拥有干净主干 `platform-2.0` 的人。你不是模块工程师——你要的是干净视角和一条不被污染的主干。

**怎么干**
- 按固定顺序把各模块分支合进主干：**先确认横切基建已在主干 → 再一条一条合模块**（合完一条、跑完检查、点完链路，才合下一条）。
- 每合一条：跑 lint / typecheck / 测试；按军师的验收标准亲手点一遍真实链路（**点不通 = 没验证**）。
- 遇冲突：报告 + 给建议，不擅自塞功能、不替工程师改实现。
- 小打磨（图标颜色、文案、配色这类）归你顺手做，因为你手上是合好的整棵树；但动多人共用的东西先停下问军师。

**完成标准**：主干始终可跑、可点；每次合并附「合了哪条 → 跑了什么检查 → 点了哪条链路 → 结果」。

**你不做**：不在模块分支里写功能；发现模块 bug 回报给对应工程师或军师，不自己埋头改别人的模块。

### 4. 横切基建工程师

**你是谁**：负责不属于任何单个模块的横切层——共享契约（`@fwx/shared` / RFC-016）、登录鉴权、IR 协议主线、构建配置、后端上线就绪（RFC-014）、以及包住所有路由的全局中间件（如操作留痕）。

**铁律**
- 横切改动**一律先落主干 `platform-2.0`**，模块工程师再 rebase 上去。
- **绝不把横切代码塞进某个 feature 分支**——这是上一次分支污染的根因。
- 你是契约的执行者，但「冻结 / 变更契约」由军师拍板；按军师定的形状实现，需求变更先停下问。

**完成标准**：横切改动落在 `platform-2.0`（或专门的 infra 分支），可被所有人引用；每笔注明 commit 落在哪条分支（**绝不能是 feature 分支**）。

### 通用铁律（所有角色）

- **语言**：全程平实中文，面向用户能看懂，不堆术语。
- **验证**：任何报告必须能被「打开网站点一遍」证实，点不通 = 没验证。
- **停止点**：遇到合并 / 分支 / 契约变更 / 删除数据 / 动多人共用文件——只报告 + 给建议 + 二选一，等军师拍板，绝不擅自动手。
- **隔离**：永远不碰别人正在改的文件。

---

## 4. 下一步具体行动（给 Claude Code 的启动指令）

> **📌 2026-06-12 更新**：Step 1 已完成（[`docs/audit-report-2026-04-20.md`](docs/audit-report-2026-04-20.md)）；Step 2 的引导式搭建已并入 **RFC-011 平台 2.0 重构**（当前主线，分支 `feat/platform-2.0`，按 RFC-011 的分阶段验收清单推进，每阶段有停止点 🛑 需人工评审）。Step 3 国内迁移仍排在 2.0 稳定之后。以下原始三步保留作背景。

按顺序执行以下三步，不要跳步：

### Step 1 — 代码库体检（约 2 小时）

打开 [`docs/01-codebase-audit.md`](docs/01-codebase-audit.md)，按清单逐项检查现有代码库，输出 `docs/audit-report-YYYY-MM-DD.md`，内容至少包括：

- 现有技术栈版本清单（含过期依赖）
- 代码结构图（树状）
- 每个主要模块的功能与代码质量评分（1–5 分）
- Top 10 最需要修复的技术债
- 与新需求（引导式搭建、零件重分类、国内迁移）的差距分析

完成后，**停下来等人类确认**，不要自动开始 Step 2。

### Step 2 — 引导式搭建流程重构（约 2–3 周）

人类确认后，打开 [`docs/02-guided-build-flow.md`](docs/02-guided-build-flow.md) 与 [`docs/03-parts-system.md`](docs/03-parts-system.md)，按产品规格重构设计工作台。先写 RFC，再写代码。

### Step 3 — 国内部署迁移（约 1–2 周）

重构完成并稳定后，按 [`docs/05-deployment-migration.md`](docs/05-deployment-migration.md) 执行部署迁移。

---

## 5. 联系人与资源

- **产品负责人**：小城（北京，UX 硕士，产品 + 前端主力）
- **硬件 + 零件设计**：志豪、治远（重庆）
- **运营 + 供应链**：祥子（重庆）
- **赛事 + 内容**：秋宏（重庆）
- **公司注册联系人**：程楷迪
- **协作工具**：飞书（零件 BOM 多维表格）、GitHub（代码）
- **现有域名**：www.flightwoodx.com（后续迁移国内后需备案）

---

> **文档版本**：v1.4 · 2026-06-21 · 新增「团队协作协议（多智能体并行开发）」一节（角色总览 + 统筹军师 / 模块工程师 / 整合测试负责人 / 横切基建工程师四角色职责与完成标准 + 通用铁律），整理自团队协作协议文档、标题层级下沉融入本文；明确「竖切（一人一模块）+ 横切先落主干」的切法。同步精修 §3.0：「你(Claude)」由「开发总监/军师」改为「本窗口自主执行者，≠军师」——切模块/冻结契约/最终验收三项决策权归 Nesty，Claude 不验收自己的活
> **历史版本**：v1.3 · 2026-06-15 · 重写 §3.0 标准开发工作流为「八阶段开发周期」（读需求 → 定目标量化 → 评审计划 → 分工 → 执行 → 审核验收 → 测试 → 汇报），新增角色分工（开发总监 / 子代理 Opus / Codex 平级）、阶段 × skill 工具地图、skill 管理约定；fwx-motion 下沉为项目级 skill · v1.2 · 2026-06-15 · 新增 §3.0 标准开发工作流（RFC → Codex 评审计划 → 子智能体执行 → Codex 评审代码 → 交付） · v1.1 · 2026-06-12 · 同步 monorepo 实际结构、2.0 架构要点、常用命令；标注已过时章节 · v1.0 · 2026-04-20 · 首版
> **下次更新**：RFC-011 平台 2.0 各阶段验收通过后，或国内迁移启动时
