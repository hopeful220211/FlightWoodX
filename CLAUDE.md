# CLAUDE.md — FlightWoodX 项目开发文档（给 Claude Code 的工作指令）

> 本文档是 Claude Code 在本项目中的**首要工作指引**。请在每次新会话开始时先完整阅读本文档，再依据 `docs/` 目录下的子文档执行具体任务。

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
前端：React 18 + TypeScript + Vite  →  部署在 Vercel
3D：  Three.js（GLB 模型 + 卡扣点元数据 JSON）
后端：Node.js + Express  →  部署在 Railway
数据库：MongoDB Atlas（M0 免费档，512 MB）
认证：JWT（7 天过期）+ bcrypt（10 轮盐）
设计工具：Rhino → 导出 GLB + JSON
协作工具：飞书多维表格（零件 BOM 管理）
```

### 2.2 零件分类（团队最新分组，按 `parts/` 目录中的 GLB 文件）

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

### 3.1 文件与目录

- 本项目根目录预期结构（如果现有代码库不符，第一件事就是提出整改建议）：
  ```
  /
  ├─ apps/
  │   ├─ web/              # 前端 React 应用（Vite）
  │   └─ api/              # 后端 Express 应用
  ├─ packages/
  │   ├─ parts-schema/     # 零件 JSON schema 与类型定义（前后端共享）
  │   └─ ui/               # 跨 web / 未来 mobile 的共享 UI 组件
  ├─ assets/
  │   └─ parts/            # GLB 模型与预渲染缩略图
  ├─ docs/                 # 本文档所在目录
  └─ CLAUDE.md
  ```
- 如果当前是**单仓扁平结构**（一个根 React + 一个独立 api 目录），**不要擅自重构为 monorepo**，先在 `docs/01-codebase-audit.md` 的输出里提出建议，由人类决策后再执行。

### 3.2 代码风格

- TypeScript 严格模式（`strict: true`），禁止 `any`，需要宽类型时用 `unknown` + 类型守卫。
- 组件文件 PascalCase，hook 文件 `useXxx.ts`，工具函数 camelCase。
- 中文注释 OK，但**所有标识符、commit message、PR 标题用英文**。
- 提交前跑 `pnpm lint && pnpm typecheck`，两者全绿才能提交。

### 3.3 写代码时的优先级

1. **可读性 > 简洁性 > 性能**。这是教育产品，不是性能敏感场景。
2. **幂等性 > 便捷性**。所有数据库操作要考虑重试和幂等，学校场景网络不稳。
3. **先让 12 岁小孩能用 > 再让设计师满意 > 再让工程师自豪**。如果三者冲突，按此顺序取舍。

### 3.4 与人类协作

- **每完成一个任务模块，先给简短 PR 摘要**（做了什么、改了哪些文件、为什么这么做、测试了什么），再问「要不要我继续下一个模块」。
- **任何架构层面的决策**（换框架、拆 monorepo、换数据库、改 API 契约）都要**先出 RFC 文档**放在 `docs/rfcs/` 下，获得人类确认再动手。
- 遇到模糊的产品需求，**不要自己脑补**，先列出 2–3 个可能的解法，说清各自的权衡，让人类选。

### 3.5 绝对不要做的事

- ❌ 不要删除 `assets/parts/` 下的任何 GLB 文件（那是设计师多轮迭代的成果）。
- ❌ 不要在未经确认的情况下动 MongoDB 的索引和集合结构。
- ❌ 不要引入任何需要付费 SaaS 订阅的依赖（如付费 Sentry、付费 Algolia）。
- ❌ 不要把 API Key、JWT Secret、数据库连接串写进代码或 commit。一律用 `.env` + `.env.example`。
- ❌ 不要在课程内容里虚构学术引用、虚构获奖信息、虚构学生案例。

---

## 4. 下一步具体行动（给 Claude Code 的启动指令）

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

> **文档版本**：v1.0 · 2026-04-20 · 首版
> **下次更新**：完成代码库体检后（预计 4 月底）
