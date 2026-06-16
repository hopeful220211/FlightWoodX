# RFC-012-A-impl · 设计界面打磨 — 实现子 RFC

| 字段 | 值 |
|---|---|
| 父 RFC | RFC-012-A（任务书）· RFC-011 §4-B1 设计器 |
| 作者 | 工程师 A |
| 工作目录 | `Projects/fwx-design`（隔离 worktree，分支 `feat/design-polish`，基线 `9ce5f2c`） |
| 状态 | Codex 计划评审已过（2026-06-16，意见见 §8）；按评审拆为两轮执行 |
| 红线 | 不碰编程/仿真界面；不改 `packages/shared` IR 与适配器；不改 `packages/parts-schema` 公共契约；不删改 `public/models/` 下任何 GLB |

---

## 1. 背景与现状（已实地核实，非推测）

设计器六步流程（主板→起落架→保护板→装饰件→检查→安装电机）逻辑可用，但渲染粗糙。我读了真实代码 + 解析了 GLB 资产，**已坐实的事实**：

**A. 「乱线」的根因是 3D 资产坐标/缩放约定不统一（不是渲染代码用了线框）。**
- `ThreeCanvas` 主场景灯光充足（环境光 1.5 + 平行光 2.5），`GLBPart` 把材质强制成实体木色（`MeshStandardMaterial`, roughness 0.75）——主渲染路径**没有** wireframe。
- 解析 GLB 发现：不同零件的**网格节点缩放约定完全不同**：
  - `core_hub_01.glb`：网格节点 `scale=0.00201`（把约 500 倍大的原始几何缩回正常），连接点是其**子节点**、本地 `scale=497.5`（0.00201×497.5≈1，正确继承）。
  - `arm_01.glb`：网格节点 `scale=1.0`（无缩放），连接点本地 `scale=0.01`。
  - 即：每个零件**内部自洽**，但**零件之间**的根缩放约定不一致 → 渲染尺寸、卡扣点世界坐标的量纲对不齐 → 拼到一起大小悬殊、互相穿插，看起来像「乱线」。
- 所有零件 `materials` 为空（无内嵌材质），网格名是 `零件库完整.3562`/`arm_!` 等 Blender 残留名 → 完全依赖运行时强制上色。
- **修复只能在加载时用代码做归一化**（CLAUDE.md §3.5 + 父 RFC §3 禁止改 GLB）。

**B. 渲染/交互代码满是调试残留与死代码。**
- `GLBPart` 每次渲染 `console.log` 整个场景图（逐零件、每帧级别噪音）。
- `SceneContent` 里 ghost 预览、高亮插座渲染被「为排查白屏暂时注释」，留下大段死代码。

**C. 第5步体检指标有两套打架的算法。**
- 顶部重量条 `WeightBar` 用真实零件重量（`realtimeChecks.calculateWeight` → 11/35g）。
- `FlightStats` 用 `designStats.calculateStats`，其权重表 key 还是旧分类码（HUB/ARM…），与现行新分类（mainboard/landing…）对不上 → 每件回退成 8g；`getWeightLabel` 阈值（60/100g）也与 35g 上限不一致。
- 已有大白话标签助手（`getWeightLabel`/`getThrustLabel`/`getSymmetryLabel`：「够轻/适中/偏重」）可复用。

---

## 2. 目标与量化验收（对照父 RFC §7 DoD）

| # | 目标 | 量化验收标准 |
|---|---|---|
| G1 | 3D 装配干净可辨 | 典型设计（1 主板+4 起落架+保护板）渲染为大小协调、对齐、无明显穿模/错位的木质无人机；非乱线。修复前后截图对比。 |
| G2 | 零件拼装落位动效 | 新零件添加时有 ≤400ms 的克制落位动画（缩放/位移渐入），不卡顿；`prefers-reduced-motion` 下直接最终态、无动画。 |
| G3 | 友好体检报告 | 第5步四项（重量/重心或对称/推重比/对称性）各有可视化仪表 + 大白话结论 + 一个总判定「能飞 / 还差点」；重量口径与顶部重量条一致。 |
| G4 | 六步流程 UI 打磨 | 当前/完成/锁定三态清晰；空态、错误态不破版；375px 与 ≥1024px 均不破版。 |
| G5 | 工程绿 | `pnpm typecheck` + `pnpm lint` 全绿；本任务改动文件 0 console 报错（移除调试噪音后）。 |

---

## 3. 方案设计（按 Codex 评审拆两轮）

> **Round 1（本轮，核心坐标系）**：G1 3D 修复 + 清场 + G3-重量口径统一。
> **Round 2（次轮，坐标系稳定后）**：G2 拼装动效 + G3-体检报告视觉 + G4 六步 UI。
> 拆分理由：G1 触碰核心坐标系，影响面广；先稳住它再做表层，避免动效/UI 掩盖吸附回归。

### 3.0 Phase 0 — 先跑起来、亲眼确认（Round 1 第一步）
依赖已装。`pnpm dev:web` 进设计器，用 agent-browser **截「修复前」图** + 读控制台，确认「乱线」的确切视觉表现（尺寸悬殊？穿插？法线/某类零件异常？），并据此**定归一化常量与验收截图**。
- 采纳 Codex：Phase 0 用于「确认症状 + 定常量」，**不是**在「修渲染 vs 修吸附」间摇摆——架构选择已定（见 3.1），渲染与连接点必须统一来源，不再分叉。

### 3.1 G1 — 3D 装配渲染修复（核心，采纳 Codex 修订）
- **集中「零件准备层」（asset-prepare）**，替代当前「渲染走 `useGLTF+clone`、连接点另走 `getWorldPosition` 缓存」的分叉。该层对每个模型输出三件套并缓存：① prepared scene clone（供渲染）② 从**同一份** prepared scene 抽出的 connectors（供吸附）③ 该模型的 `normalizationScale/offset`。`GLBPart` 与 `usePartConnectors` 都读这一层 → **视觉与吸附坐标同源**。
- **归一化策略**：**不**按包围盒把所有零件拉到同一尺寸（会抹掉主板/起落架/保护板本该不同的物理尺寸）。改为**按零件类型/模型白名单定标**的 `normalizationScale`，对**网格 + 其子连接点整体施加同一变换**（零件内部相对关系不变）。**禁止用 `instance.scale` 做归一化**（吸附数学不读实例 scale，会"看着对、数学错"——采纳 Codex）。
- **旧设计坐标迁移（采纳 Codex 风险提醒）**：已保存的 `PartInstance.position/rotation` 是旧坐标系产物，归一化后不自动等价。故 **G1 验收限定「新建装配」**；检测到旧本地草稿时**提示重建**（加设计 schema 版本标记），**不默默兼容**。
- **材质管线整理**：统一木质材质工厂；处理「无材质网格」（给默认木质 PBR）；法线/阴影正确；高亮/拖拽变暗逻辑收口到一处。
- **清场**：移除 `GLBPart` 每帧 `console.log`、`SceneContent`/`ThreeCanvas` 死代码注释块。

### 3.2 G2 — 拼装落位动效（R3F 场景内，克制）
- 在零件渲染组件里，对「新添加」的零件用一次性入场动画：从「略放大/略上方 + 透明」过渡到最终 snapped 变换，~300–400ms、ease-out（干脆），只动 transform/opacity。
- 实现走 R3F 惯用法（`useFrame` 插值或 spring），不引 GSAP 到 3D（GSAP 是 DOM 配方）；DOM 层的步骤切换提示可按 fwx-motion 配方克制处理。
- `prefers-reduced-motion: reduce` → 跳过动画，直接最终态。
- 仅对「最近新增实例」播放一次，避免每次重渲染全体零件抖动。

### 3.3 G3 — 友好体检报告
- **重量口径统一（Round 1 落地，采纳 Codex）**：让 `calculateStats` **直接复用 `realtimeChecks.calculateWeight`**（真实零件重量，与 `WeightBar` 同源），**不**去修 `HUB/ARM…` key 表（那只是把第二套系统修到"暂时正确"，仍会再分叉）。同时把 `getWeightLabel` 的 60/100g 阈值改成 35g 上限口径，避免 UI 文案与 `WeightBar` 打架。
- 第5步 `REVIEW` 步骤内呈现四项体检卡：每项一个简单可视化（进度环/条 + 颜色档）+ 大白话结论（复用现有标签助手）+ 顶部一个总判定徽章「能飞 / 还差点」（由四项汇总，沿用现有 green/yellow/red 分级）。
- 仅前端展示与计算口径修正，不改数据模型字段。

### 3.4 G4 — 六步流程 UI 打磨
- `StepProgressBar` 三态（完成/当前/锁定）视觉与可点性清晰；`WelcomeEmptyState` 空态、违规提示（`fwx-violation`）错误态不破版；桌面优先、375px 优雅降级。
- 设计语言遵循现有 sky-blue/wood 体系与 `high-end-visual-design`/`frontend-design` 原则，但**克制**（工具页）。

### 3.5 影响面与红线自检
- 只动 `apps/web/src/components/design/**`、`apps/web/src/pages/Design/**`、`apps/web/src/pages/ExportPreview/{FlightStats,FlightCheckReport}.tsx`、`apps/web/src/utils/{designStats,realtimeChecks}.ts`、`apps/web/src/hooks/usePartConnectors.ts`（仅加归一化，不破坏导出签名）。
- **归一化后必测的连接点消费方（采纳 Codex 补漏）**：`ThreeCanvas` 桌面拖拽 + 触控拖拽（两套重复逻辑都要测）、`designStore.addPartSmart`、`SceneContent.DragSnapLogic`、`SocketHighlights`、`ActionMenu`（基于 connector 重算位置/翻面/换连接器）、`prefetchAndExtractConnectors` 预加载缓存。归一化变量必须在这些路径全部一致生效。
- **不动**：`packages/shared`、`packages/parts-schema`、编程/仿真目录、`public/models/` GLB、公共路由/导航/导出桶。
- 如需新类型，放设计自己的 `types/design.ts`，不进公共契约。

---

## 4. 交付物清单（可勾选，按两轮）

**Round 1（核心坐标系）**
- [ ] Phase 0：修复前截图 + 控制台诊断记录 + 归一化常量
- [ ] G1：集中零件准备层（渲染+吸附同源）+ 按类型归一化 + 材质管线 + 清场（3D 干净可辨）
- [ ] G1 回归：桌面/触控拖拽、addPartSmart、SocketHighlights、ActionMenu 吸附正确
- [ ] 旧草稿坐标迁移：检测到旧设计提示重建（schema 版本标记）
- [ ] G3-重量：`calculateStats` 复用 `calculateWeight` + 标签阈值改 35g 口径
- [ ] Round 1 截图（修复前后 3D 对比）+ `pnpm typecheck && pnpm lint` 全绿 + 0 console 报错

**Round 2（坐标系稳定后）**
- [ ] G2：克制落位动效（R3F 场景内，含 reduced-motion 降级）
- [ ] G3-报告：四项可视化 + 大白话 + 总判定「能飞/还差点」
- [ ] G4：六步流程三态 + 空/错态 + 375px 响应式
- [ ] Round 2 截图（各步骤、体检报告两种判定、移动端）
- [ ] 全程独立分支 + commit；等负责人决定再合并（见停止点）

## 5. 测试计划
- 视觉：agent-browser 在 1024px + 375px 走完整六步，逐步截图；体检报告在「能飞 / 还差点」两种设计下各截一张。
- 工程：`pnpm typecheck`、`pnpm lint`、`pnpm --filter @fwx/shared test`（若触及，预计不触及）。
- 回归：reduced-motion 开启后页面完整可读、零件直接最终态。

## 6. 停止点 🛑
编码 + Codex 代码评审 + 截图齐全后**停下汇报**，由负责人决定是否合并。不自行合并。

## 7. Codex 评审的关键问题（已回答，见 §8）
1. G1 归一化策略是否足以同时解决尺寸不一致与吸附正确性？
2. Phase 0「先看再定修法」是否合理？
3. 体检重量口径：改 key 错配 vs 复用 `calculateWeight`？
4. 四块一轮是否过大、是否拆？

## 9. 负责人决策修订（2026-06-16，对话中拍板）

- **G1 拼装摆位：冻结，不再动。** 负责人明确「拼装逻辑是对的，这一步先不要动拼装逻辑」。故撤回 §3.1 的归一化/确定性摆位计划；保留**已完成**的相机自动取景 + 材质阴影 + 清场。
- **Round 1 已交付（commit c924d0f）**：相机自动取景、调试清场、重量口径统一、修复 trunk 因 `.gitignore: build/` 误伤 `pages/Build/` 导致编译失败（强制纳入 BuildPage 占位；彻底修需改公共配置，待协调）。
- **新增功能（commit ce9d508）**：点击顶部进度条上「已到达」的步骤即跳转到该步（`goToStep`），无需再点左下角「上一步」。属 G4。
- **后续按负责人指定顺序推进（1→2→3→4）**：
  1. **G3 第5步友好体检报告**：重量/重心/推重比/对称四项可视化仪表 + 大白话结论 + 「能飞 / 还差点」总判定（重量口径已统一）。
  2. **G4 六步流程整体观感**：步骤条/零件面板/引导语的配色·间距·三态精致统一，空态/错态不破版。
  3. **G2 零件拼装落位动效**：克制的入场动画（R3F 场景内，尊重 reduced-motion）。
  4. **移动端/平板适配**：375px 与平板不破版、可用。
- 每步独立 commit + 截图，全部完成后停下汇报（停止点 §6 不变）。

## 8. Codex 计划评审结论（2026-06-16）与采纳情况
- **拆两轮**（采纳）：Round 1 = G1 + 清场 + 重量口径；Round 2 = 动效 + 报告 + UI。
- **G1 不做 bbox 统一尺寸**（采纳）：改为集中准备层 + 按类型/白名单归一化 + 渲染/吸附同源。
- **不用 `instance.scale` 归一化**（采纳）：吸附数学不读实例 scale。
- **旧设计坐标迁移**（采纳）：G1 验收限新建装配，旧草稿提示重建，不默默兼容。
- **重量复用 `calculateWeight` + 标签阈值改 35g**（采纳），不修 key 表。
- **影响面补漏**（采纳）：ThreeCanvas 桌面/触控双路径、ActionMenu、SocketHighlights、预加载缓存归一化后全测。
- Phase 0 保留，但架构（统一来源）已定，不再摇摆。
