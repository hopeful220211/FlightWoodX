# RFC-012-B-impl · 编程界面友好化（实现子 RFC）

| 字段 | 值 |
|---|---|
| 父 RFC | RFC-012-B（任务书）/ RFC-011 §4-B2 |
| 作者 | 工程师 B |
| 状态 | 待 Codex 计划评审 |
| 工作目录 | `Projects/fwx-share` |
| 新分支 | `feat/rfc-012-b-coding-friendly`（从 `feat/m5.5-share` 切出） |

---

## 1. 现状核对（已读代码确认，非臆测）

- `pages/Coding/CodingPage.tsx`：左 Blockly 工作区 + 右**原始 IR JSON**（`serializeProgram(ir)` 塞进 `<pre>`，面板标题「指令协议 IR」）。
- 空态：中心 Blockly 画布**无引导**；右面板只有一行小字「拖拽左侧积木开始编程」。
- `handleRun`：**桩**（TODO M4），只 `toast`，**未把 IR 交给仿真**。
- `blockly/compiler.ts`：`compileWorkspace()` 已把积木编译成经 zod 校验的 `CommandProgram`，**无需改**。
- `blockly/blocks.ts`：积木定义 + `DRONE_TOOLBOX`，四类（飞行动作/传感器/逻辑/循环）。
- **接缝事实**：本分支 `pages/Simulator/SimulatorPage.tsx` 是**纯占位空壳**（写死「阶段三 M4 接入」，不消费任何 IR，无 `programStore`）。本分支**没有** `programStore`。

## 2. 红线（只用不改）

- 不改 `packages/shared/src/commandProtocol.ts`（IR 契约冻结）。类型**只 import，不重复定义**。
- 不改 `SimulatorPage.tsx` / 设计界面（RFC-012-B §3 禁止触碰仿真/设计界面）。
- 「飞行计划预览」= 把已有 IR **翻译**成大白话展示，**不碰 IR 结构本身**。

## 3. 改动清单（全部落在编程界面范围内）

### 新增
| 文件 | 作用 |
|---|---|
| `apps/web/src/blockly/flightPlan.ts` | 纯函数 `describeProgram(ir): PlanLine[]`，把 IR 递归翻成大白话行（含缩进层级）。**只 import IR 类型**。 |
| `apps/web/src/blockly/flightPlan.test.ts` | 单测：覆盖全部 11 种 command（含 ifElse/repeat/while 嵌套），锁定「预览正确」。 |
| `apps/web/src/blockly/exampleProgram.ts` | 「从示例开始」载入的简单示例（起飞→前进→灯光→降落）的 Blockly XML 常量。 |
| `apps/web/src/stores/programStore.ts` | 运行交接 store（Zustand，仿 `authStore`）：`{ program, blocklyXml, setProgram() }`。 |
| `apps/web/src/pages/Coding/components/FlightPlanPanel.tsx` | 右面板：飞行计划列表 + 「开发者视图」开关（开关后才显原始 JSON）。 |
| `apps/web/src/pages/Coding/components/EmptyCanvasGuide.tsx` | 空画布覆盖层：鼓励文案 +「从示例开始」按钮。 |

### 修改
| 文件 | 改动 |
|---|---|
| `apps/web/src/pages/Coding/CodingPage.tsx` | ① 右面板换用 `FlightPlanPanel`（默认飞行计划，开关切原始 JSON）；② 画布套 `EmptyCanvasGuide`（0 积木时显示，可载入示例）；③ 工具栏加「整理」按钮（`workspace.cleanUp()`）；④ `handleRun` 改为：校验通过 → `setProgram(ir, xml)` → `navigate('/simulator/'+id)`。 |

## 4. 关键设计

### 4.1 飞行计划翻译（交付物 #1）
`describeProgram(ir)` 返回 `PlanLine[]`，每行 `{ depth, icon, text, swatch? }`：
- `takeoff`→「起飞到 100 厘米」`land`→「降落」
- `move`→「向前飞 150 厘米」（方向中文化）`rotate`→正「向右转 90°」负「向左转 90°」
- `hover`→「悬停 0.5 秒」`led`→「灯光变成 ⬛」（带色块 swatch）
- `ifElse`→「如果 前方距离 < 30 厘米：」+ 缩进子句 +（可选）「否则：」
- `repeat`→「重复 4 次：」`while`→「当 … 时一直循环：」`waitUntil`→「等到 … 为止」
- `lockAxis`→「锁定 前后/左右/升降」
- 条件 `Condition` 单独翻译：sensor（前方距离/对地距离/电量）+ op + value。
- 渲染：按 `depth` 缩进，纯展示，无副作用。

### 4.2 开发者视图开关（交付物 #1 后半）
`FlightPlanPanel` 内 `useState(false)`，默认**飞行计划**。右上角小开关（眼睛/代码图标）。打开才渲染原有 `serializeProgram` 的 `<pre>`——**保留**工程师自检能力，只是从孩子默认视图移走。偏好不持久化（避免过度设计）。

### 4.3 空态引导（交付物 #2）
`ir == null || ir.commands.length === 0` 时，在 Blockly 画布上叠 `EmptyCanvasGuide`（绝对定位、居中、`pointer-events` 仅按钮可点）。「从示例开始」→ `Blockly.Xml.domToWorkspace(parse(EXAMPLE_XML), ws)`，触发既有 change listener 自动编译，覆盖层随之消失。

### 4.4 运行交接（交付物 #4）——**含一条接缝，需负责人/Codex 拍板**
- 我做**交出**这半边：`programStore.setProgram(ir, xml)` + `navigate('/simulator/:id')`。
- 仿真页**接收+渲染**那半边是**工程师 C** 的活；本分支仿真页是空壳、且 §3 禁止我碰仿真界面。
- **本轮可验收的部分**：`programStore` 落库正确 + 单测用 fixture 证明「IR 经 store 取出后与编译产物一致、可反序列化」（DoD §7「可用 fixture 验证」即指此）。
- **明确不在本轮闭环**：点运行后仿真画面真的飞起来——依赖 C 读这个 store。我会在汇报里把这条缝标红，不假装做完。
- 备选（更解耦，若 Codex 认为新增 store 越界）：改用 `sessionStorage` 存序列化 IR + navigate；store 方案与既有 `authStore/designStore` 风格一致，倾向 store。

### 4.5 动效（遵 fwx-motion：编辑器类要克制）
- 仅：飞行计划行入场轻量淡入、空态按钮 hover 态。**不上**滚动/钉住等强动效。
- 全程尊重 `prefers-reduced-motion`：减弱时直接呈现最终态。

## 5. 自检 / DoD 对账
- [ ] 默认视图无原始 JSON；飞行计划随积木实时更新（change listener 已驱动 `ir` state）。
- [ ] 空态有引导，「从示例开始」可载入示例。
- [ ] 运行把 IR 写入 `programStore` 并跳转仿真入口（fixture 单测验证交出半边）。
- [ ] 无 console 报错；375px / ≥1024px 不破版（右面板在 `lg` 下右置、窄屏下置底，沿用现有响应式类）。
- [ ] `pnpm --filter web typecheck && lint` 全绿；类型只 import，无重复定义 IR。

## 6. 不做（避免范围蔓延）
- 不重排积木种类、不改积木→IR 映射、不动 toolbox 之外的编译逻辑。
- 不做飞行计划的「点某行高亮对应积木」联动（留作最终愿景，非本轮）。
- 不持久化开发者视图开关、不做多示例选择器（只一个示例）。

## 7. 停止点
编码 + Codex 代码评审 + 6+ 截图齐全后停下汇报，等负责人决定合并。不自行合并。

## 8. Codex 计划评审结论与采纳（2026-06-16）
**结论：同意，§4.4 与测试需小改。** 已采纳：
1. `flightPlan.ts` 中文映射用普通对象，类型一律来自 `@fwx/shared`，不重写 union/enum。
2. `programStore` **不加 `persist`**（运行会话≠正式保存），职责限定「运行交接」，不扩成项目保存/历史/仿真状态。
3. `handleRun` 跳转防空 id：`id ? navigate('/simulator/'+id) : navigate('/simulator')`。
4. 测试分两层：`flightPlan.test.ts`（纯函数 11 command + 嵌套）证明「翻译正确」；「实时更新」改/载/清三条进**手测 + 截图**清单（改积木→文案变 / 载示例→文案现 / 删空→空态回）。
5. 空态覆盖层：容器 `pointer-events-none`、按钮 `pointer-events-auto`，不挡 Blockly 拖拽/缩放/flyout；示例**仅空画布**加载防叠加。
6. 响应式 375px：画布区给最小高度、右面板窄屏 `max-h` + 可滚。
7. reduced-motion：减弱时无行入场动画，直接最终态。
