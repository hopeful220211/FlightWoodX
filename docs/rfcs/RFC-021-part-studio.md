# RFC-021 — 自制零件工坊（DIY Part Studio）

> 状态：草案（待 Codex 计划评审）· 模块：零件库 · 工程师：3 号 · 分支：`feat/part-studio`（基于干净 `platform-2.0`）
> 来源：`自制零件工坊-①需求文档PRD` + `②开发文档技术规格`（军师已冻结定位与技术栈与契约形状）。本 RFC 是这两份文档在仓库内的落地计划：补充**量化验收**、**里程碑任务分解**、**集成缝（哪些是我的新文件 / 哪些要和 5 号协调）**、**共享契约落地依赖**、**渲染缺口解法**。

---

## 1. 背景与目标（一句话）

在引导式搭建无人机的**每一步**，孩子可以**自己手绘一个零件**（2D 画封闭图形 → 设卡口 → 给厚度自动 extrude 成 3D），存到自己名下、下次能复用，并能在搭建里**替换官方件**或**当装饰附加**。

### 三条已拍板定位（不可动摇）
1. 按真实标准画、先 App 内用：板厚=固定常量（先按 **3mm 胶合板**占位，待硬件组确认）；卡口对齐现有零件接口；轮廓必须闭合可切。
2. 既能替换、也能附加。
3. 平板优先（笔/指），鼠标兼容。

### 非目标（v1 不做）
- 🔴 通用多形状布尔（任意加/减/交）、求交、刻名字/图案、offset/贝塞尔精修、kerf/过盈滑块。这些**永不下发给孩子**或留 v2。

---

## 2. 设计概要（对脊柱/共享层的影响）

核心思想顺着项目 IR 哲学：**自制件存的是参数化 2D 定义 `CustomPartDef`；运行时纯函数 `compileCustomPart(def)` 编译成一个"和官方件同形状"的运行时对象（category + snapPoints + 挤出几何），让现有兼容引擎/搭建流程原样消费，不特判。**

```
CustomPartDef (参数化源·存库)
   │ compileCustomPart(def)   ← 纯函数，前后端可共用
   ▼
RuntimePart { category, snapPoints[], geometry(ExtrudeGeometry), thumbnail }
   ▼
现有 canAddPart / canAdvanceStep / isCategoryAllowedInStep 原样消费（只看 category+数量+snap type）
```

### 技术栈（②已定死，照此实现）
- 输入：**Pointer Events**（`getCoalescedEvents` 取全中间点、`pressure` 压感、`pointerType==='pen'` 忽略 touch 防掌触、画布 `touch-action:none`）。
- 显示：**perfect-freehand**（MIT，只管笔触好看，几何另算）。
- 几何核心：**paper.js**（MIT，路径/simplify/布尔 unite/段编辑/导出点直转 THREE.Shape）。
- 规整：自写最小二乘拟合圆弧（Taubin/Kåsa）+ $1 Unistroke + 鞋带公式。
- 出料：**Three.js `ExtrudeGeometry`**（已装 three@0.182）。
- 兜底：**polygon-clipping**（仅当 paper.js 数值出问题再引）。

> 全链路 MIT、零付费 SaaS（符合 §3.5 红线）。新增依赖：`paper`、`perfect-freehand`—— 本任务②技术规格明确要求，授权范围内。`polygon-clipping` **不预装**，仅当 paper.js 真出数值问题再引（Codex 评审①采纳）。

### 风险优先：先做"真能拼"的脊柱，后做画布美化（Codex 评审①采纳）
v1 范围仍为 PRD 的 🟢+🟡 全部，但**重排顺序**——最大风险不是"画不出漂亮弧线"，而是"自制件存了之后在搭建里查不到 / 渲染不到 / 吸附方向错 / 重量校验口径分叉"。因此把**卡口编译 + 统一 resolver + 存储 + 集成**前置，把 **$1 识别 / 最小二乘圆弧 / 合并 / 圆角 / 对称**等画布增强排到最后（见 §9 重排里程碑）。$1 识别 v1 先降级为"线/圆两个显式按钮"，最小二乘圆弧排到末段；perfect-freehand 仅作显示层、不进几何验收。

### 两个确定踩的坑（务必处理）
1. **绕向**：挤出前按鞋带公式校正——外轮廓 CCW、孔 CW，否则带孔件破面/孔不通；方向不对就反转点序。
2. **paper.js 是命令式库**：挂独立 `<canvas>`，**别塞进 r3f 渲染循环**；2D 编辑完把轮廓点交给 r3f 做挤出预览，两块解耦。

---

## 3. 数据契约（军师已冻结，落 `@fwx/parts-schema`，**交基建提交**，我引用不私自加）

复用现有 `SnapPoint['type']`（`'arm-mount'|'guard-mount'|'deco-mount'|'motor-mount'`）与 `PartCategory`，不新造平行类型。新增（形状见②§3）：`Outline2DSchema`、`CustomConnectorSchema`、`CustomPartDefSchema`（含 id/ownerId/name/actAs/outline/holes/thicknessMm/connectors/schemaVersion/createdAt/updatedAt）、纯函数 `compileCustomPart(def): RuntimePart`。

**依赖（阻塞集成/存储里程碑）**：上述类型与 `compileCustomPart` 需**基建**落到 `@fwx/parts-schema` 后我才能 import。纯画布里程碑不依赖它，先行。落地前我用 feature 内部类型仅描述"画布/几何运行时态"（非跨端契约），不把 `CustomPartDef` 私自写进共享包。

### 契约微调建议（向基建/军师提案，落地前定，非私改）（Codex 评审①采纳）
现有前端吸附数学消费的是 `ConnectorInfo{ type:'socket'|'plug', position, quaternion }`（见 `usePartConnectors.ts` / `design.ts` / `snap.ts`），而冻结的 `CustomConnectorSchema` 只有 `{type:SnapPoint.type, edgeIndex, t}`。两点需在契约落地前补齐：
1. **`endKind: 'socket'|'plug'`**：自制件该卡口是公头还是母头——这是语义选择，无法从几何推导，必须**存进** `CustomConnectorSchema`。
2. **完整朝向**：`position+normal` 不定 roll。但对平板挤出件，朝向由"边切线 × 外法线 × 板厚轴"三正交轴**唯一确定**，故 `compileCustomPart` 可由 `edgeIndex+t+outline+thickness` **推导出完整 quaternion**（GLB 同一坐标约定：插入方向 `-Y`），无需额外存字段。
→ 建议基建落地时把 `endKind` 加入 `CustomConnectorSchema`；`compileCustomPart` 产出 `ConnectorInfo`（GLB 约定 quaternion），现有 `computePerpendicularSnap`/plug-to-plug flip 才能原样复用。我不私改共享包，按此提案交基建。

---

## 4. 渲染缺口与解法：统一 part resolver（Codex 评审①重构后）

现有搭建场景是 **GLB 中心**的：`GLBPart` 用 `useGLTF(modelUrl)` 加载 `.glb`，卡口从 GLB 场景图按命名对象（`SOCKET_*`/`PLUG_*`）抽取并缓存。自制件**没有 .glb**，只有运行时 `ExtrudeGeometry` + 显式 connectors。

**消费 `partsData.find` 的点不止 4 个**（Codex 实查）：`designStore.addPartSmart`、`ThreeCanvas`（拖拽/触控吸附）、`SocketHighlights`（合法位高亮）、`ActionMenu`（翻转/换连接点）、`realtimeChecks`（重量校验）。若到处塞 `if diy://` 分支，必漏一处 → 自制件查不到/重量按默认/吸附错。

**解法 = 统一 resolver 层（新文件，单一入口）**，`diy://` 只作内部 asset id，**绝不泄露到 `useGLTF`/GLTFLoader 预取**：
```
features/partStudio/runtime/partResolver.ts
  resolvePart(partId)         → official | custom 的运行时 meta（category/name/...）
  getRuntimeConnectors(partId)→ 官方件走 GLB 抽取缓存；自制件走 compileCustomPart 产出的 ConnectorInfo[]
  getRuntimeRenderable(partId)→ { kind:'glb', url } | { kind:'customGeometry', geometry }
  getRuntimeWeight(partId)    → 官方查 registry；自制件用 def 的真实重量（不默认 2g）
```
现有各 consumer 改为走 resolver（薄缝，交 5 号协调）；渲染处按 `getRuntimeRenderable` 分支到我的新组件 `<CustomGeometryPart/>`（`compileCustomPart` 几何 + 木纹材质 + 内联 connectors）。

> 此解法把"官方/自制"的差异收敛到一个 provider，不深改 GLB 主管线、不污染 `useGLTF` 缓存，符合"现有引擎不特判 category"的目标。

---

## 5. 集成缝：我的新文件 vs 要协调的文件

### 5.1 100% 我的新文件（零碰撞，可立即开工）
```
apps/web/src/features/partStudio/
  PartStudioPage.tsx          // 左画布右3D预览 容器（M1）
  canvas/usePointerDrawing.ts // Pointer Events + coalesced + 掌触防误（M1）
  canvas/paperCanvas.ts       // paper.js 封装：路径/simplify/布尔/镜像/圆角（M1/M2）
  canvas/closePathDetect.ts   // 封闭检测+端点吸合（M1）
  canvas/beautify.ts          // 拟合圆弧 + $1 识别 + 鞋带公式（M2）
  preview3d/ExtrudePreview.tsx// THREE.Shape(+holes)+ExtrudeGeometry 绕向校正（M1）
  connectors/snapInherit.ts   // 卡口"挑合法点+自动继承"对齐变换（M0/M3）
  runtime/partResolver.ts     // 统一 resolver：resolvePart/getRuntimeConnectors/Renderable/Weight（M0/M3）
  render/CustomGeometryPart.tsx// 运行时几何渲染件（diy:// 仅内部 id，M0/M3）
  store/customPartStore.ts    // Zustand + IndexedDB；接口同构③后端（M2）
  data/templates.ts           // "拿现有零件当模板改"起始模板（M4）
```

### 5.2 要和 5 号 / 设计打磨工程师协调的薄缝（M3，不擅自改）
> 这些文件归搭建/设计器流程，设计打磨工程师（RFC-012-A，`feat/design-polish`，"拼装逻辑冻结"）在动。**我不擅自改，缝由整合（5 号）牵头协调**；我先把缝两侧做成"可插拔":
- `StepPartPanel.tsx`：在官方件网格旁加「✏️ 自己画一个」入口（最小插入）。
- `designStore.ts` `addPartSmart()` / `addPartToActiveDesign()`：支持接收自制 `partData`（diy:// + 内联 connectors）。
- `SceneContent.tsx` / `GLBPart.tsx`：加 `diy://` 渲染分支。
- `App.tsx`：`/part-studio` 路由（或在 GuidedDesignPage 内开模态）。

**策略**：M1/M2/M4 全在 5.1 的新文件里完成（孩子能画→编辑→存→在"我的零件"复用），价值已闭环；M3 的薄缝改动以**补丁/提案**形式交 5 号，由整合统一落，避免和设计打磨撞文件。

---

## 6. 命门：卡口"挑合法点 + 自动继承"（最重要）

铁律：**卡口绝不让孩子徒手画/拖**（差 0.1–0.2mm 即从"严丝合缝"翻成"插不进/一掰就裂"）。
- 现有每个零件带 `SnapPoint{position, normal, type}` 作"接口契约"。
- 孩子让自制件接官方件：靠近 → 引擎**只亮出兼容的合法接口点** → 点选 → 自制件该 connector 自动**继承**目标接口的 position/normal/type（取互补），实际几何由后台常量反算。
- 孩子全程只表达"想在哪连"，毫米数系统反算 → 天然同板厚、尺寸由板厚导出、位置与伙伴件配准、类型互补 → "真能卡进官方件"。
- 公差/kerf/过盈**不进契约**，制造时后端材料表解析；运行时拼装只用 position/normal/type 对齐，沿用现有 `connectionRules.ts`，不另立一套。

---

## 7. 界面（抄 Doodle3D 形态）

左 2D 画布 + 右 3D 实时预览并排联动。顶部=当什么用(主板/机臂/保护板/装饰)+名+保存；左画布=网格背景(吸附默认开)+好看笔触；底部工具条大图标少而精(✏️画/⭕基本形/🕳️挖洞/🪞对称/↩️撤销/🧲对齐/🔘圆角，选中段浮出"✨变规整")；右 3D=「立起来」+旋转+显示将装到哪。文案全程儿童化动词化，**绝不出现** 布尔/extrude/subtract/公差/kerf 等术语。冷启动给 30 秒引导或"拿模板改"。移动端笔优先、画布禁页面滚动、按钮大而稀。

---

## 8. 量化验收标准（对应 PRD §8，负责人可亲手点）

| # | 验收点 | 里程碑 |
|---|---|---|
| 1 | 搭建任意一步点「自己画一个」→ 进工坊，左画布右 3D 并排 | M1+M3缝 |
| 2 | 画未闭合形 → 明确提示"有缺口"；差一点 → 端点自动吸合闭合 | M1 |
| 3 | 画歪线 → 按住 → 变成漂亮直线/弧 | M2 |
| 4 | 形里画小圈 → 自动变成洞 | M2 |
| 5 | 画一半 → 点对称 → 自动补成左右对称 | M2 |
| 6 | 点「立起来」→ 右侧 2D 变有厚度 3D（旋转无破面） | M1 |
| 7 | 设卡口只能落在系统给的合法位；放回无人机能和官方件拼上 | M3 |
| 8 | 命名保存 → "我的零件"出现；换页/重进还在（本期本地存储） | M4 |
| 9 | 同一自制件既能在该步替换官方件，也能在装饰步附加 | M3 |
| 10 | 全程无技术术语；12 岁能独立走完 | 全程 |

**工程验收（DoD 六条全绿）**：① 核心闭环真实数据（本期 IndexedDB，无 mock）② `pnpm --filter web lint && pnpm --filter web typecheck` 绿 ③ `pnpm --filter web test` + 动 `@fwx/parts-schema` 跑其单测 绿 ④ 后端接通后真连库（本期前端先行，接口同构）⑤ 给点击路径 ⑥ 列动过的共享文件。

### 边界验收（Codex 评审①补，几何/触控/存储健壮性，单测覆盖）
| 类别 | 必测项 |
|---|---|
| 自相交 | 自交路径：拒绝，或归一化后只生成单一外轮廓（even-odd） |
| 退化 | 面积/边长/点数/包围盒有 min·max 阈值；越界拒绝并儿童化提示 |
| 孔 | 必须完全在外轮廓内、不相交不越界、≥最小切割面积、绕向强制 CW |
| 外轮廓 | 强制 CCW；清重复点/近重点；NaN/Infinity 拒绝 |
| 卡口 | 离角点/孔/边界保留 keepout；边长不足放不下卡口则不亮该位 |
| 类别 | mainboard/landing/guard/joint 各自最小 connector 数与方向校验 |
| 触控 | pen 时忽略 touch（掌触防误）；纯手指可画；`pointercancel` 不丢状态 |
| 存储 | 同 id upsert 不产生重复件；reload 后 resolver 能渲染；坏数据 zod 拒绝 |
| 幂等 | 保存用 deterministic id / idempotency key，弱网重试不重复（§3.3） |

---

## 9. 里程碑与任务分解（Codex 评审①重排为风险优先）

> 重排理由：最大风险在"自制件能否真在搭建里被查到/渲染/吸附"，不在画布美化。故先打通卡口编译+集成脊柱，再补画布增强。范围仍是 PRD 的 🟢+🟡 全部，只是顺序变。

- **M0 卡口脊柱 spike（最先，去最大风险）**：硬编码一个矩形 `CustomPartDef` → `compileCustomPart` 产出 `ConnectorInfo[]`（GLB 约定 quaternion）→ 经统一 resolver 放进 guided 场景 → 能吸附到官方主板。验收：硬编码自制矩形件吸附官方主板、朝向正确、无破面。
- **M1 最小画布与成型**：Pointer 画（coalesced+pressure+掌触防误）+ 封闭检测/端点吸合 + simplify + 绕向校正 + 一键立起来（ExtrudeGeometry）。验收：画方块→3D 块旋转无破面（§8-2,6）。
- **M2 存储复用**：customPartStore（Zustand + IndexedDB，接口同构③后端 `list/get/save/remove`）+ zod 校验 + id-upsert 幂等 + "我的零件"列表，换页/重进仍在（真实数据源，非 mock）。验收：§8-8。
- **M3 集成（替换/附加）**：StepPartPanel 加「✏️自己画一个」入口 + 各 consumer 走统一 resolver + `actAs`→category 走兼容引擎 + 替换官方件/装饰附加 + `<CustomGeometryPart/>` 渲染。薄缝交 5 号协调。验收：§8-1,7,9。
- **M4 画布增强（最后，体验提升）**：挖洞(嵌套环)+对称(mirror+unite)+合并(unite)+圆角+hold-to-snap 规整（圆/弧拟合 + 线/圆显式按钮）。验收：§8-3~5。

依赖 `CustomPartDef`/`compileCustomPart` 落 `@fwx/parts-schema`（基建）→ 阻塞 M0(compile)/M2(zod)/M3 的 import；M1 纯画布不阻塞，可与 M0 并行起步（M1 用 feature 内部几何类型，存储时再过契约）。

---

## 10. 停止点 🛑 / 红线

- 🛑 **共享契约落地 + endKind 微调**：`CustomPartDef` 等由基建落 `@fwx/parts-schema`，我引用不私自加；落地前向基建/军师提案把 `endKind:'socket'|'plug'` 加入 `CustomConnectorSchema`（见 §3 契约微调建议）。到 M0/M2/M3 前若未落，停下请整合/基建落，不在 feature 分支私写共享类型。
- 🛑 **薄缝撞文件**：M3 改 `StepPartPanel/designStore/SceneContent/App` 前找 5 号协调（设计打磨在动），不擅自改别人文件。
- 🛑 **板厚常量**：先 3mm 占位，硬件组志豪/治远确认后改。
- 红线：卡口只"挑合法点+自动继承"，**不实现任何拖卡口毫米/调板厚交互**；不改色调；不动 IR/DroneAdapter/现有 parts-schema 数据；不删 GLB/CAD；缺图找军师；做完 push 交 5 号不自己合。

---

## 11. 测试计划

- 几何纯函数（绕向校正、闭合检测阈值、拟合圆弧、$1 识别、compileCustomPart）：vitest 单测（可放 `@fwx/parts-schema` 单测 for compile）。
- 端到端（画→立起来→设卡口→存→复用）：`webapp-testing`/`agent-browser` 走 PRD §8 路径。
- `pnpm --filter web lint && pnpm --filter web typecheck` 全绿；动 `@fwx/parts-schema` 跑其单测。
