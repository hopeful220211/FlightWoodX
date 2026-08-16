# RFC-015 · 仿真试飞（Sim Flight）技术方案

| 字段 | 值 |
|---|---|
| 状态 | Draft v0.2（据 Codex 计划评审返工，待二次评审 + 人类确认） |
| 作者 | 程楷迪（Corty） / 军师代笔 |
| 日期 | 2026-06-16 |
| 关系 | **RFC-011 B3 模拟器/试飞的深化**。对接 IR 脊柱（§6.1）、Scene（D2）、评分/回放（D3）、AI 教练（G2）、真机（H2）；**物理参数数据依赖 [RFC-014 后台零件管理](RFC-014-admin-console.md) 的零件录入**。 |
| 范围 | 技术选型、物理模型、两种试飞模式、两种场景、数据契约、UI、分期与任务拆分。 |
| **不在范围** | 真机控制（H 层）、评分 rubric 细节（D3）、AR 的 iOS 原生方案。 |

> **〔v0.2 修订摘要〕** 据 Codex 评审返工：① **目标诚实分级**——P0 只承诺"相对设计风险诊断"，"预测真机成功率"是 P1/P2 标定后目标；② **新增数据地基前置**——现 registry 无电机/桨/电池零件、零件无装配位置，物理仿真无法起步，这是 P0 第一件事；③ **数据契约改回基于现有 `commandProtocol.ts`**（`execute/stop` + `ExecHooks`，v0.1 的 `load/run/step` 是错的）；④ 遥控器另设接口、不污染基础 `DroneAdapter`；⑤ P0 收窄为配重对照实验，气动/AR 后置；⑥ 补标定协议、验收基准、诊断阈值、安全边界。

---

## 1. 背景与目标

### 1.1 现状（代码核实，2026-06-16）
- `simulator/SimAdapter.ts` 是**轻量运动学**模型（位置/航向直接插值，非动力学）；`FlightScene.tsx` 是 telemetry 驱动的占位几何；`SimulatorPage` 还直接读 `SimAdapter.getState()`（绕过 adapter 合约，迁移时收掉）。
- **物理数据地基不存在**（关键）：`parts-schema/registry.ts` 的 94 个零件**全是 1–5g 结构件**（主板/起落架/保护板/连接件），**没有电机/螺旋桨/电池零件实体**（电机是"自动安装"占位）；`PartEntry` 只有 `weightG`，**无装配位置、无推力参数**。
- `commandProtocol.ts` 已定义 `DroneAdapter{ execute(program,hooks); stop() }` + `ExecHooks{onCommandStart/onTelemetry/onFinish}` + `RunResult{success,score,events}` + `Telemetry{posCm,headingDeg,frontDistanceCm}`。**这是必须复用、扩展的既有契约。**

### 1.2 目标（诚实分级 —— 这是 v0.2 最重要的修正）
| 阶段 | 能做到 | 不能做到 |
|---|---|---|
| **P0（相对诊断）** | 体现配重/重心/转动惯量/推重比差异；判断"能不能起飞的趋势""哪里配重不合理""A 设计比 B 稳" | 不承诺真机起飞概率（缺实测数据） |
| **P1/P2（逼近真机）** | 补电机+桨+电池实测参数、标定、金样机对照后，逐步逼近"真机成功率" | 仍非 100%（结构形变/装配误差/环境无法全建模） |

> 🔴 **诚实底线**：重量分布/配重/重心/推重比这些"决定能否起飞"的量，物理引擎能算准；但"预测真机成功率"必须等数据标定（§8）。**P0 先把"相对配重诊断"做到可信，已是核心价值。**

---

## 2. 技术选型（调研结论）

> 结论：无"物理准确、可直接用的网页无人机模拟器"（GitHub 上均玩具级）；所需"零件"全开源且对接现有栈，做**集成适配**。

| 能力 | 选型 | 说明 |
|---|---|---|
| 物理内核 | **Rapier `@dimforge/rapier3d`** | 按 collider density/mass **自动合成整机质心+角惯量**；确定性可开。⚠️ 动态体用 box/capsule/**convex hull**，**不用 GLB trimesh** |
| React/Three 集成 | `@react-three/rapier` | 与现有 R3F 无缝 |
| 飞行动力学/飞控 | **移植 `gym-pybullet-drones` 公式** | 推力∝转速²、级联 PID。⚠️ 移植需明确单位/坐标系/mixing matrix/饱和/积分限幅/固定步长（如 240Hz）/测试基准——**工作量不是"数百行"，需专人** |
| 渲染 | 复用 `FlightScene` 外壳 | 保留壳，替换内核 |
| AR | WebXR（安卓）| ⚠️ iOS 不支持；**移出主路径，P2/暂缓** |

---

## 3. 物理模型（核心）

1. **每零件 → Rapier collider（convex hull）**，质量取自零件 `weightG`（+ 待补的电机/电池/桨质量）。
2. **Rapier 自动合成**：整机 `m` / 质心 `CoM` / 角惯量 `J`。**配重/分组差异自动进入这三个量。**
3. **HUD 质量属性我们自算一份 mass model，与 Rapier 结果做单测对账**（防 collider 形状/位姿错导致偏差）。
4. **4 电机推力** `T_i=k_T·ω_i²` 作用在各电机真实位置 → 合力/合扭矩（含偏航反扭矩）→ Rapier 积分。
5. **飞控**：级联 PID（P0 先做姿态稳定 + 悬停油门，不做完整任务飞行）。
6. **配重必然体现**：重心偏 → 力臂不等 → 姿态发散；TWR<1 → 离不了地。自动发生。
7. P0 **暂不做**地效/阻力/下洗（→ P1/P2）。

---

## 4. 数据地基前置（🔴 P0 第一件事，v0.2 新增）

物理仿真**无法在当前数据上起步**，必须先补：
1. **电机 / 螺旋桨 / 电池作为零件实体**（含质量）——电池常是最重件，缺它配重必失真。
2. **每个零件的装配实例位置**：`DroneDesign` 需含每个零件的 `instanceId / partNumber / transform(位置+朝向) / mountPoint`，否则 Rapier 不知道零件在哪、质心算不出。
3. **电机推进参数**：起步用通用缺省值（标注"未标定"），录入走 **RFC-014 后台零件管理（M4）**。
> 没有 1+2，"配重体现"都做不到。所以 P0 从补数据开始，不是从写物理开始。

---

## 5. 数据契约（基于现有 `commandProtocol.ts`，扩展不另造）

```ts
// 既有，复用：DroneAdapter.execute(program, hooks) / stop()
// 编程驱动：物理内核在 execute 背后驱动，基础接口不变（守 IR 红线）

// 〔v0.2〕遥控器另设能力，不污染基础 DroneAdapter、不传 program=null：
interface ManualControlAdapter {
  supportsManualControl: true
  setManualInput(input: ManualInput): void   // 归一化 -1..1
  startManual(scene: Scene): void
  stop(): void
}
interface ManualInput { throttle: number; yaw: number; pitch: number; roll: number }

// 扩展既有 Telemetry / RunResult（增量、向后兼容）：
interface TelemetryExt extends Telemetry { attitude: [number,number,number]; altitudeCm: number }
interface RunResultExt extends RunResult {     // 既有 {success,score,events}
  physics: { mass: number; comOffset: [number,number,number]; twr: number; inertia: [number,number,number] }
  issues: FlightIssue[]                        // 诊断，阈值来源见 §8
}
type ManualInputFrame = ManualInput & { tMs: number }  // 手动输入记录，独立于 IR；回放=telemetry+inputLog
```

**parts-schema 增量**（分类型、带单位/标定条件/版本）：
```ts
interface MotorParams { kThrustNperRpm2: number; kTorque: number; kv: number; maxThrustG: number; calib: 'measured'|'default'; ver: number }
interface PropParams  { diameterMm: number; pitchMm: number }
interface BatteryParams { massG: number; voltageV: number; capacityMah: number }
```
> 须新增 `MOTOR/PROP/BATTERY` 零件并补 `CATEGORY_FOLDERS`（现仅 4 类）。类型入 `@fwx/parts-schema`，禁止 web/api 重复定义。

---

## 6. UI 方案（试飞页）

```
┌──────────────────────────────────────────────┐
│ 步骤条：设计 ─ 编程 ─ [试飞]  (试飞可跳过编程直达) │
│ 模式：(编程驱动|遥控器)   场景：纯虚拟(P2再加AR)   │
├───────────────────────────────┬──────────────┤
│      3D 试飞场景（蓝天/场地）   │ 实时物理 HUD  │
│                               │ 总重/重心/推重比│
│                               │ 姿态/高度/平衡度│
├───────────────────────────────┴──────────────┤
│ 遥控器：左摇杆(油门/偏航) 右摇杆(俯仰/横滚)        │
│ 编程：▷播放 ⏸暂停 ⏭单步 ↻重置（高亮当前指令）     │
├──────────────────────────────────────────────┤
│ 试飞报告：能否起飞趋势 / 稳定度 / 配重诊断+建议     │
│  例:"重心偏后→易翻尾,建议电池前移"(对接 G2 教练)  │
└──────────────────────────────────────────────┘
```
- 报告措辞用"相对诊断"口径（趋势/风险/建议），不写"真机成功率 X%"（除非已标定）。

---

## 7. 分期与停止点

- [ ] **P0a 数据地基**：补电机/桨/电池零件+质量、`DroneDesign` 装配实例 transform、电机缺省推进参数。🛑
- [ ] **P0b 物理内核 + 遥控器 + 纯虚拟**：Rapier 集成（convex hull）、质量合成、推力+姿态 PID、虚拟摇杆起飞。**验收见 §9。** 🛑
- [ ] **P1 编程驱动 + 评分/回放 + 基础气动**：经现有 `execute` 接入 IR；`RunResultExt` 诊断；地效/阻力；固定步长可复现。🛑
- [ ] **P2 AR（安卓）+ 标定逼近真机**：WebXR 实验；接入实测推力曲线，逐步逼近真机预测。🛑

---

## 8. 标定与验收（v0.2 新增，回应"参考价值"）

- **标定协议**：至少 1 张「电机+桨+电池」组合的 RPM/PWM/电压/推力表（硬件团队提供）；无则参数标 `default`，仅相对诊断。
- **验收基准**：3 个金样机型 + 3 个配重变体（如电池前移/后移），跑仿真，**对照真机实测起飞结果**，看仿真能否区分好坏。
- **诊断阈值来源**：`com-too-rear / twr-insufficient / unbalanced-axis` 的阈值要有依据（标定或保守经验值），不能只写枚举。
- **安全边界**：真机适配器**不得直接复用网页手动输入语义**，需限幅/急停/失联策略（H 层另议）。

---

## 9. P0 量化验收

1. 同一机型，**仅把电池前移/后移**，仿真输出的 `comOffset` 必须随之变化（配重不可"无感"）。
2. `TWR<1` 的机子，仿真中**起不了地**。
3. 重心偏出阈值，起飞后**必现可见俯仰/横滚发散**。
4. 我们自算 mass model 与 Rapier 质量属性**单测对账**误差在容差内。
5. 遥控器模式可手动起飞/悬停；纯虚拟场景跑通。

---

## 10. 任务拆分（供派活）

| 块 | 内容 | 归属 |
|---|---|---|
| **T0 数据地基** | 电机/桨/电池零件+参数、DroneDesign 装配 transform、parts-schema 增量 | 契约军师定，前端+后端(RFC-014 M4) |
| **T1 物理/飞控** | Rapier 集成、质量合成+对账、推力模型+姿态 PID 移植 | 资深/懂物理者 |
| **T2 场景/HUD/遥控器** | FlightScene 升级、HUD、虚拟摇杆、ManualControlAdapter | 前端 |
| **T3 IR/评分对接** | 经 `execute` 接 IR、RunResultExt、回放、诊断 | 前端，P1 |

---

## 11. 开放问题（待决策）

1. **电机/桨/电池实测数据**：硬件团队（志豪/治远）能否提供推力曲线？这是"逼近真机"的前置。
2. **DroneDesign 是否已存装配位置**：需核实现有 design 数据结构，没有则 T0 要补。
3. 手动输入回放：记录为 `ManualInputFrame[]`，独立 IR（建议）。
4. AR：iPad 无 WebXR，暂缓，不进 P0/P1（建议）。
5. 既有实现：保留 `FlightScene` 壳，新建 `RapierFlightEngine` 内核替换（建议）。

---

*— RFC-015 结束 —*
*版本 v0.2 · 2026-06-16 · 据 Codex 评审返工 · 翼创未来 · 锚定 RFC-011*
