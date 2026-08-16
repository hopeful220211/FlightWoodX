# RFC-018 P2 — 赛事中心整体重做（站酷级年度赛事站）

> 模块工程师·赛事 · 分支 `feat/rfc-018-competitions` · worktree `fwx-competitions`
> 上游：RFC-018 P0（列表/详情/报名/提交/排行榜后端已交付）已合入本分支。

## 1. 背景与目标

现状赛事中心只有两条干瘪列表卡，太简陋。本轮升级为**有 hero、有赛段时间线、有奖项、有参赛指南、有排行榜**的完整年度赛事站，视觉对标站酷级。

**核心约束（守住禁区）：**
- 功能数据（赛事/报名/提交/排行榜）**全接 RFC-018 P0 真后端，零 mock**。
- **不动共享契约**（`@fwx/shared` 的 `Competition/Submission/Score` 等），跨前后端类型一律 import 自 `@fwx/shared`。
- 富区块（赛段/奖项/指南）= **前端编辑内容 + 配图**，不入库、不需新后端字段。
- 配图已就位：`apps/web/public/competitions/` 7 张（军师生成，直接用）。
- 不碰社区/后台/零件模块。做完 push 自己分支，**不自己合**，交 5 号整合。

## 2. 关键设计决策

### 2.1 契约不动，富内容走前端 editorial 模块
`Competition` 类型无配图/赛段/奖项字段，且**禁止改契约**。故：
- 新建 `pages/Competitions/content/competitionContent.ts`：导出富区块的**编辑内容**（赛段三段、奖项金银铜+特别奖、指南步骤）+ **配图映射** + 这些内容的 TS 类型。
- 配图按**赛事名启发式**映射 hero：名字含「年度」→ `annual-2026-cover.png`；含「区域」→ `regional-cover.png`；否则 `hero-center.png`。映射函数 `heroImageFor(comp)` 与 `editorialFor(comp)` 收敛在该模块，避免散落。
- 编辑内容（赛段/奖项/指南）对「翼创未来」两个赛事是**通用格式**，两赛事详情页共用同一套富模板，仅 hero/名称/状态/时间/报名数/排行榜按 API 数据变化。

### 2.2 动效：装 gsap（军师已批准动公共文件）
- 安装 `gsap`（含 ScrollTrigger）于 `apps/web`。**动到 `apps/web/package.json` + 根 `pnpm-lock.yaml` 两个公共文件，军师已口头批准**（验收⑤列出）。
- hero 视差、区块揭示用 ScrollTrigger；遵守 `fwx-motion`（编辑/展示页克制动效，尊重 `prefers-reduced-motion`）。
- 已有 `ScrollReveal`/`useScrollReveal` 可与 gsap 并存，简单揭示优先复用，视差等滚动联动用 gsap。

### 2.3 seed：2 个真实赛事入库
改 `apps/api/scripts/seed-competitions.js`，幂等造：
- ① **2026 翼创未来·年度创意赛**（status `open`，富详情页，hero=annual-2026-cover）— 挂报名+提交+人工评分 → 排行榜非空。
- ② **2026 翼创未来·秋季区域实飞赛**（status `open`/`closed` 待定，hero=regional-cover）。
- 赛事名必须与 §2.1 hero 启发式匹配。旧的两个 demo 赛事名替换为这两个。

## 3. 页面结构

### 3.1 赛事中心 landing（`CompetitionsPage.tsx` 重做）
- 顶部 hero 横幅 `hero-center.png` + 标题/口号 + 视差。
- 年度旗舰大卡 `annual-2026-cover.png`（点进详情）+ 第二赛事卡 `regional-cover.png`。旗舰按名字含「年度」从真实列表中挑。
- 排行榜入口。
- 数据来自 `useCompetitions()` 真实列表；保留 loading/empty/error 三态。

### 3.2 年度赛事详情页（`CompetitionDetailPage.tsx` 重做，重点）
- Hero（映射 cover）+ 报名按钮 + 状态/时间/报名数（API）。
- 锚点导航：赛事介绍 / 赛程赛段 / 奖项设置 / 参赛指南 / 排行榜·获奖。
- 赛程赛段：三张赛段卡 设计`stage-design`→编程`stage-program`→仿真`stage-sim`，时间线。
- 奖项设置：`awards.png` + 金银铜 + 特别奖。
- 参赛指南：报名→设计→编程→仿真→提交 步骤。
- 排行榜/获奖公示：接 `useLeaderboard()` 真实排行，展示 Top N + 「查看完整排行榜」跳 `LeaderboardPage`。
- 报名/提交按钮接 `useRegister()/useSubmit()` 真实动作（沿用 P0 逻辑与权限）。

### 3.3 排行榜/提交页
- `LeaderboardPage.tsx`：视觉打磨 + 获奖公示（前三名高亮），数据真实。
- `CompetitionSubmitPage.tsx`：轻度视觉对齐，不改逻辑。

## 4. 子 agent 分工（严格按文件归属，避免并行冲突）

> 编排者（我）**先建** `competitionContent.ts`（含编辑内容 + 配图映射 + **组件 props 类型**）与空的 `components/` 目录约定，再派 4 个 agent，各自**独占下列文件**，互不重叠：

- **A · landing**：`CompetitionsPage.tsx` + `components/CompetitionHero.tsx`（landing hero）+ 旗舰/区域卡（同文件内或 `components/CompetitionCards.tsx`）。
- **B · 详情壳**：`CompetitionDetailPage.tsx` + `components/DetailHero.tsx` + `components/AnchorNav.tsx`；**装配** C/D 的子区块（按约定 props import）。
- **C · 赛段/奖项/指南**：`components/StagesTimeline.tsx` + `components/AwardsSection.tsx` + `components/GuideSection.tsx`（纯展示，props 取自 content 模块）。
- **D · 排行榜·获奖**：`components/LeaderboardPreview.tsx`（详情页嵌入用）+ `LeaderboardPage.tsx` 打磨 + `CompetitionSubmitPage.tsx` 轻度对齐。

B import C/D 的组件靠**约定的 props 类型**（统一从 `competitionContent.ts` 导出），最终全量 typecheck 兜底接口一致性。seed 我自己改。

## 5. 验收标准（五条全绿）
1. 真库跑通无 mock（2 赛事已入库；报名/提交/排行榜真实）。
2. `pnpm --filter web lint && pnpm --filter web typecheck` 绿。
3. 后端真连库（内存 Mongo 临时验证栈）。
4. 给出点击路径让军师亲手验。
5. 列出动过的共享文件（预期：`apps/web/package.json`、`pnpm-lock.yaml`；**不含** `@fwx/shared`）。

## 6. 停止点 🛑
P0 已交付不回退；本轮做完 push 分支交 5 号整合，**不自己合**。临时验证环境默认开着等军师验。P1（自动评分/回放/赛季）仍等 RFC-015。

## 7. Codex 计划评审采纳 + 决策更新（评审①后）

- **[动效] 改用 framer-motion（已装 ^12），不装 gsap**（军师二次确认）。→ §2.2 作废，hero 视差/区块揭示用 framer-motion + 现有 `ScrollReveal`；**本轮预期零共享文件改动**（验收⑤更新为「无」）。
- **[hero 映射] 弃用名字模糊匹配，改显式注册表**：`competitionContent.ts` 维护「标准化完整赛事名 → contentKey → editorial/hero」映射，名称两侧空白与 `·` 归一化；未知赛事回退 `generic`。**不绑 ObjectId**。
- **[seed 幂等] 真幂等**：seed 必须先清理/迁移旧 demo 赛事名（旧的「暑期线上海选/春季体验赛」），避免连跑后残留多余赛事；连跑两次赛事数、评分状态不变。
- **[seed 数据] 年度赛事 seed ≥3 条真实成绩**，否则前三名视觉无法验；第二赛事 status 钉死（年度=open，区域=closed 已结束→「获奖公示」语义成立）。
- **[语义] 不伪造真实赛程/获奖**：赛段卡叫「创作流程·三赛段」，不写每段虚构日期；排行榜 open→「实时榜单」，closed→「获奖公示/最终成绩」。
- **[分工] 两波并行**：第一波 A(landing)/C(赛段·奖项·指南)/D(排行榜预览·LeaderboardPage·SubmitPage) 并行；**第二波 B** 在 C/D 落地后装配详情页。seed 编排者自己改。content 模块只导出 `CompetitionEditorial/StageContent/AwardContent/GuideStep` + resolver + 锚点 ID 常量；组件 props 各自定义、约定签名。
- **[状态矩阵] B/D 落实**：未登录/游客→`/auth`；open 未报名→可报名+提交提示先报名；已报名→可提交；closed→禁报名禁提交+最终榜。提交按钮看登录+报名+状态三者，不只看状态。`/login` 与 `/auth` 都通，统一用 `/auth`。
- **[验收补强] 加 `pnpm --filter web build`**；首屏仅 hero eager，其余配图 `loading="lazy"`；验移动端锚点横滚 `scroll-margin-top`、窄屏排行榜、reduced-motion。
