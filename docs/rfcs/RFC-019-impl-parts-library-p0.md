# RFC-019 实现子 RFC · 零件库 P0「分类派生 + 修白屏 + 真实列表/详情」

| 字段 | 值 |
|---|---|
| 状态 | Reviewed（Codex 计划关：有条件通过 → 已按 6 项必修修订）→ 开工 |
| 父 RFC | [RFC-019 零件库](RFC-019-parts-library.md)（消费 [RFC-016 契约](RFC-016-platform-shared-contracts.md)） |
| 负责 | 3 号工程师 |
| 分支 | `feat/parts-library`（独立 PR；只提交零件库相关文件，不碰工作区里他人 WIP） |

---

## 1. 目标（只做 RFC-019 的 P0，不越界）

把零件库从「6 张硬编码旧码卡 + M7 占位虚线框」改成**真实可用的三层目录**，并修掉两个紧急 bug：

1. **分类码统一**：分类/中文名/数量全部从 `@fwx/parts-schema` 派生，删掉硬编码的 `HUB/ARM/PLATE/JOINT/LAND/DECO`。
2. **修 WebGL 白屏**：列表卡片**用预生成的静态缩略图 `<img>`（`/thumbnails/*.png`，已 1:1 存在）**，全列表零 WebGL context。
3. **真实列表 + 详情**：分类浏览 → 分类内网格 → 零件详情 `/parts/:id`（大图 + 元数据 + 兼容性提示）。
4. **搜索/筛选**：按名称 / 编号 / 标签实时过滤。

## 2. 现状核实（已勘查）

- `PartsPage.tsx`：硬编码 6 卡（旧码，数量 77，与事实不符），下方 M7 占位框。
- 事实来源 `@fwx/parts-schema`：`PART_REGISTRY` 94 件 = mainboard 16 / landing 39 / guard 28 / joint 11（`MOTOR/PROP` 枚举存在但 registry 未填）。
- ✅ 资产齐全：`apps/web/public/thumbnails/*.png` 与 `public/models/**/*.glb` 与 registry **1:1**。
- ✅ `apps/web/src/data/parts.ts` 已是 registry 翻译层（含 `thumbnailUrl = /thumbnails/{file}`）。
- ✅ 单 Canvas 组件 `PartPreview3D`（`modelUrl` + 自旋转）已存在，**留给 P1 详情 Live 3D**。
- `App.tsx` 仅有 `/parts` 路由，无 `/parts/:id`。

## 3. 方案

### 3.1 分类派生（删旧码，单一事实来源 → 放 parts-schema）
> **【Codex 必修 1】** 分类中文名是领域语义，**放进 `@fwx/parts-schema`**，web 只消费；不在 web 层造新权威。
- 在 `packages/parts-schema/src/registry.ts` 新增：
  - `CATEGORY_LABELS: Record<PartCategory, { zh: string; en: string }>` —— 6 类各给**正确**中文名：mainboard 主板 / landing 起落架 / guard 保护板 / joint 装饰件 / **MOTOR 电机 / PROP 螺旋桨**（不再把 PROP 错并入「电机」）。
  - `getPartCategoryInfo(category)` → `{ category, label, count }`（count = `getPartsByCategory(cat).length`）。
  - `getPopulatedCategories()` → 只返回 registry 里**有零件**的类别（当前 4 类）；空类（MOTOR/PROP）不出现在零件页。
  - 经 `index.ts` 导出。
- 删除 `PartsPage.tsx` 里硬编码 `categories` 数组与「77 个 / 6 大类」文案，改用派生值。

> 仅向 parts-schema **新增纯函数/常量**，不改既有类型/registry 数据；改后跑该包构建确认无破坏。

### 3.2 修白屏（核心）
- 列表卡片 = **纯 `<img src={thumbnailUrl} loading="lazy">`**，不实例化任何 WebGLRenderer/Canvas。
- **不使用** `PartThumbnail`（它仍 `new THREE.WebGLRenderer`，是白屏根因之一）。本 PR 不删它（其他页面可能引用），只是零件库不再用它。
- 验收靠这条：landing 39 件全展示，零 WebGL context，不白屏。

### 3.3 三层导航（2 条路由，最简）
- `/parts`：分类网格（派生）+ 搜索/筛选栏。选中类别用 **URL query** `?category=landing`（可分享、后退可用），展示该类零件网格（静态缩略图卡）。`?q=` 跨类搜索。
  - **【Codex 必修 6】** 非法 `category`（不在 populated 列表）→ 回退到分类网格 / 空态；未来若加集合型路由（如 `/parts/search`）必须用**静态路径并声明在动态 `:id` 之前**。
- `/parts/:id`：**新增** 详情页 `PartDetailPage`。大图（静态缩略图）+ 中文名/编号/**类别中文名**/重量/标签 + **「这是什么」一句话**（取自 `STEP_INFO.description`，按 category→step 反查，源自 parts-schema，不自造文案）。**非法 id → NotFound**。
  - **【Codex 必修 5】** 不引用 `compatibility.ts` 当文案源；数量约束提示（如最多 8 个起落架）留 P1。
  - **【Codex 必修】** 详情页**不放**「P1 接入」大占位框；P0 就是静态大图 + 元数据。Live 3D（复用单 Canvas `PartPreview3D`）作为独立 P1。

### 3.4 列表三态 + 分页 + 重量筛选
- 三态：本页为静态数据无网络请求 → 无 loading/error；**empty**（搜索/筛选无结果用现有 `EmptyState`）。
- **【Codex 必修 2】分页 P0 就做**：本页**客户端分页** `?page=&pageSize=`（默认 pageSize=24），用现有 `Button`/原子组件拼，**不沉淀为共享组件**；军师 RFC-016 的统一 `<Pagination>` 落地后再替换。
- **【Codex 必修 3】重量范围筛选**：筛选栏加 `?wmin=&wmax=`（数字输入，零件重量 1–5g），满足父 RFC-019「名称/标签/重量范围」。

### 3.5 后端 Part.js = KitItem（仅注释）
- 在 `apps/api` 的 `Part.js` 顶部加一行注释，说明它是采购 BOM（KitItem），**不参与拼装零件浏览**。零逻辑改动、不动 DB/索引。

## 4. 改动范围（红线内）
- **改**：`apps/web/src/pages/Parts/PartsPage.tsx`（重写）、`apps/web/src/data/parts.ts`（加消费层薄封装）、`apps/web/src/App.tsx`（加 `/parts/:id` 路由）、`packages/parts-schema/src/registry.ts` + `index.ts`（**仅新增** CATEGORY_LABELS / 派生 helper）。
- **新增**：`apps/web/src/pages/Parts/PartDetailPage.tsx`、`apps/web/src/pages/Parts/components/PartCard.tsx`（静态缩略图卡）、`apps/web/src/pages/Parts/components/PartsFilterBar.tsx`（搜索/类别/重量/分页）。
- **仅注释**：`apps/api/src/models/Part.js`。
- **不碰**：`@fwx/shared`（IR/契约红线）、parts-schema 既有类型/registry 数据、设计器装配流程（B1）、`features/project`、工作区里他人的成长体系 WIP。

## 5. 验收标准（对照 RFC-019 §7 P0，已按 Codex 必修 4 精确化）
- [ ] 分类卡 / URL / 筛选参数 / 文案**不出现旧分类码** `HUB/ARM/PLATE/JOINT/LAND/DECO`（允许从 parts-schema 消费 `BuildStep` 做 category→step 映射，不算残留）；分类中文名 / 数量与 `parts-schema` 派生一致。
- [ ] landing 类展示 39 件缩略图**不白屏**：列表页**不实例化 `WebGLRenderer`、不渲染 `<canvas>`**（DevTools 无「Too many WebGL contexts」）。
- [ ] 能从分类进入分类内列表，再点进**单个零件详情** `/parts/:id`；非法 id 显示 NotFound。
- [ ] 搜索按名称/编号/标签过滤 + **重量范围筛选**生效；无结果显示空态。
- [ ] 列表**分页**生效（`?page=&pageSize=`，默认 24）。
- [ ] `pnpm lint && pnpm typecheck` 全绿，`@fwx/parts-schema` 构建通过；**未改 IR / shared 契约 / parts-schema 既有数据**。
- [ ] 桌面 + 375px 移动端可用；浏览器无 console 报错。
- [ ] 截图：分类网格、分类内列表（39 件不白屏）、零件详情、搜索/重量空态、移动端。

## 6. 明确延后（P1+，父 RFC 允许）
详情页 Live 3D（单 Canvas 复用 `PartPreview3D`）、统一 `<Pagination>`（待军师 RFC-016 组件）、可拼装 Part 持久化 + UGC + 后台审核、为 RFC-015 补电机/桨/电池数据、社交点赞/收藏、BOM 导出。

## 7. 测试计划
浏览器实跑：分类浏览 → landing 39 件看是否白屏 → 进详情 → 搜索过滤/空态；桌面 + 375px；看 console。`pnpm lint && typecheck` 全绿。

## 8. 停止点 🛑
编码 + 自检 + Codex 代码评审 + 截图齐全后，停下用大白话 + 点击路径汇报，等负责人决定合并。不自行合并。

*— RFC-019-impl v0.1 · 2026-06-17 · 3 号工程师 —*
