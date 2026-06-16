# RFC-012-B-2-impl · 编程界面打磨：像成熟图形化编程工具（实现子 RFC）

| 字段 | 值 |
|---|---|
| 父任务 | 负责人本轮口头任务书（基于 RFC-012-B 之后的打磨轮） |
| 作者 | 工程师 B |
| 状态 | 待 Codex 计划评审 |
| 分支 | 续用 `feat/rfc-012-b-coding-friendly` |
| 红线 | 只动编程界面；不碰设计/仿真/`packages/shared` 的 IR 契约 |

## 1. 调研结论（已读代码 + 看 Scratch/慧编程）

- `blockly/blocks.ts`：积木**已按分类配色**（动作蓝 #4AA3F0 / 传感器绿 #3EB489 / 逻辑金 #D4A74A / 循环棕 #a67038）；渲染器是 **`zelos`**（Scratch 同款拼图渲染器，**吸附本就是凹凸拼图式**）。
- `blockly/compiler.ts`：`compileWorkspace` 已**只跟随 `next` 连接**编译顶层链——断开的积木本就不会一起执行。
- `DRONE_TOOLBOX`：用 emoji 分类名的 XML toolbox → 这就是"丑列表"的来源。
- `index.css`：**无任何 Blockly 样式**；Blockly **只在编程页**用（blocks/compiler/CodingPage），故可放心给它加**限定在编程页**的 CSS。
- Scratch 精髓：左侧竖排彩色分类（色点/图标）、分类色=积木色、hat 起始积木、强吸附。

## 2. 本轮改什么

### P0-1 重做左侧分类面板（核心）
**不自建 React toolbox**（过度且高风险）。改为给 Blockly 原生 toolbox 套三层皮：
1. **自定义主题** `Blockly.Theme.defineTheme`：定义 4 个 `categoryStyles` + 4 个 `blockStyles`（颜色与上面一致，**分类色 = 积木色**）+ `componentStyles`（toolbox/flyout 背景、选中辉光）。替换现在的 `Themes.Classic`。
2. **toolbox 改 JSON 结构**（替换 XML 字符串）：每个分类带 `categorystyle` 和 `cssconfig.icon` 自定义类，便于挂图标与样式。
3. **限定编程页的 CSS**（新增 `blockly/blocklyTheme.css`，只在 CodingPage import）：把分类行 `.blocklyToolboxCategory` 做成**统一风格的圆角图标按钮**——左侧分类色圆形图标（内嵌白色 SVG glyph：✈飞机/📡雷达/⌥分支/↻循环，用 data-URI），清晰 **hover 态**（背景微亮 + 左侧色条）与**选中态**（分类色填充 + 白字）。CSS 全部用 `.blocklyToolboxDiv` / Blockly 类，作用域天然在注入容器内。

> 验收对应："左边面板像个正经图形化编程工具、不再是丑列表"。

### P0-2 修残留滚动条 bug
现象：展开分类 flyout 再收起后，中间偏左残留一根竖滚动条。
做法：先用 playwright dump 该元素确认是 flyout 的 `.blocklyFlyoutScrollbar`/`.blocklyScrollbarVertical` 残留还是主工作区滚动条。
最小修复（按定位结果二选一）：
- 若是 flyout 滚动条残留：CSS 在 flyout 隐藏时 `display:none` 其滚动条；或监听 `Blockly.Events.TOOLBOX_ITEM_SELECT`/flyout hide 后 `flyout.setVisible` 已处理则补 `Blockly.svgResize(ws)`。
- 若是主工作区竖条：flyout 关闭后 `setTimeout(()=>Blockly.svgResize(ws),0)` 重排。
**不引第三方**，只用 Blockly API + CSS。

> 验收对应："收起分类后没有多余的滚动条赖着"。

### P1-3 吸附更明显
zelos 已是拼图吸附。增强：inject 配置加大 `move`/连接吸附手感——设置 `Blockly.config` 的 `snapRadius`/`connectingSnapRadius`（更大磁吸半径），让两块更容易"啪"地连上。不改积木结构。

### P1-4 「开始」起始积木（程序锚点）
- 新增 `drone_start` **hat 块**：只有 `nextStatement`、**无 previousStatement**（顶部圆帽），独立"开始"配色（与 4 个分类色都不同，用深一档品牌色以示"锚点"）。
- 放进 toolbox 顶部新「▶ 开始」分类（或飞行动作首位）。
- **编译器向后兼容地认锚点**：`compileWorkspace` 若找到 `drone_start`，**只编译它的 `next` 链**；若没有，回退现有"所有顶层链"逻辑。这样既给出"程序从这里开始"的锚点，又不破坏已存程序/示例。
- 更新 `exampleProgram.ts`：示例以 `drone_start` 开头，演示锚点。
- `drone_start` 不产出 command（仅锚点），不进飞行计划。

> 验收对应："拖两块积木能吸附成一串、看得出先后" + "起始积木作为程序锚点"。

### P1-5 配色
积木已分类配色；本轮由主题统一收口（blockStyles）。`drone_start` 给独立色。确认 flyout/分类里不再"全蓝"。

## 3. 改动清单（全部在编程界面范围内）
| 文件 | 改动 |
|---|---|
| `blockly/blocklyTheme.ts`（新增） | `defineTheme` 自定义主题 + JSON toolbox 导出（替代 XML 常量） |
| `blockly/blocklyTheme.css`（新增） | 限定编程页的分类按钮/图标/hover/选中/滚动条样式 |
| `blockly/blocks.ts`（改） | 新增 `drone_start` hat；toolbox 迁到 JSON（或保留并由 theme 文件接管）；颜色常量收口 |
| `blockly/compiler.ts`（改） | 认 `drone_start` 锚点，向后兼容回退 |
| `blockly/compiler` 单测（新增/补） | 锚点存在/不存在两种语义；start 不产 command |
| `blockly/exampleProgram.ts`（改） | 示例以 start 开头 |
| `pages/Coding/CodingPage.tsx`（改） | 用新 theme/toolbox；import 主题 CSS；snapRadius 配置；flyout 关闭后修滚动条 |
| `blockly/flightPlan.test.ts`（不改） | start 不产 command，预览不受影响 |

## 4. 不做（避免蔓延）
- 不自建 React 版 toolbox / flyout 引擎。
- 不改 IR 契约、不动设计/仿真页。
- 不重排积木语义（除 start 锚点这一向后兼容增强）。
- 不引入新运行时依赖（playwright 仅截图工具，装在仓库外 `/tmp`，不进 package.json）。

## 5. 自检 / DoD
- [ ] 左侧分类：彩色统一图标按钮 + hover + 选中态，分类色=积木色。
- [ ] 展开再收起分类，无残留滚动条。
- [ ] 拖两块积木明显吸附成串；start 作锚点；只有连成串的按序执行。
- [ ] 积木非全蓝，按分类配色。
- [ ] typecheck / lint(本任务文件) / 单测 / 完整 build 全绿。
- [ ] 6+ 张 playwright 自动截图（面板、hover/选中、吸附成串、start、收起无滚动条、移动端）。

## 7. Codex 计划评审结论与采纳（2026-06-16）
**同意，含细化。** 已采纳：
1. JSON toolbox `{kind:'categoryToolbox',contents:[...]}`，小写 `categorystyle`/`cssconfig`。块继续 `setColour`（blockStyles 不会自动套到 setColour 的块），分类色走主题 `categoryStyles`（同 hex）。
2. 滚动条修复优先 `Blockly.svgResize/resizeContents` 重排，CSS 窄选择器仅兜底；先 playwright 定位元素。
3. start 语义：0→回退所有顶层链；1→只编 next 链、自身不产 command；**>1→抛友好编译错误**（不静默选一）。hat 外形用 `start_blocks` blockStyle 的 `hat:'cap'`，配 `setNextStatement` 且**不** `setPreviousStatement`。
4. CSS 收紧到编程页专属 `.coding-blockly-shell` 外层 class 下，不裸写 `.blocklyToolboxDiv`。
5. 不改现有块 type / 字段名，只新增 `drone_start`。

## 6. 收尾约定（负责人指示）
- 分支**推云端备份**；**不自己合并**（PR/merge 交整合同事）。
- 临时注释的 `BuildPage` 坏引用：本轮**保留**以便跑起来截图；汇报里**单独标注**为临时处理、需整合同事正经修复，**不作为交付物合并**。
