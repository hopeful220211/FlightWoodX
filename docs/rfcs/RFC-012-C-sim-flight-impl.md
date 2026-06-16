# RFC-012-C 实现子 RFC · 仿真试飞器「补缺口」

| 字段 | 值 |
|---|---|
| 状态 | Draft（Codex 计划关:有条件通过 → 已按意见修订） |
| 父任务 | RFC-012-C · RFC-011 §4-B3 / §6.1 |
| 分支 / worktree | `feat/sim-flight` @ `Projects/fwx-sim`（独立 PR） |
| 作者 | 工程师 C |

---

## 1. 背景：现状盘点

实地核查:**仿真器主体早已完整实装并在主线里**(非占位)。已验证无人机真会飞(高度 22→39 爬升,截图为证)。
- `SimAdapter.ts`(332)——完整 IR 执行引擎(implements `DroneAdapter`,消费 `CommandProgram`)。
- `FlightScene.tsx`(165)——R3F 场景(天空/地面/障碍柱/无人机/轨迹/视角)。
- `SimulatorPage.tsx`(175)——已接好,内置示例 IR、运行/停止/重置、HUD、结果 toast+日志。

**本子 RFC 不重做,只补缺口。**

## 2. 缺口与方案

### 缺口 1：撞机判定（只改 `SimAdapter.ts`,不碰 shared）
- 新增 `DRONE_RADIUS_CM = 18`(贴合模型横向≈36cm;玩法宽松半径)。
- 新增私有 `checkCollision()`:无人机与各障碍 **XZ 水平距离 < radiusCm + DRONE_RADIUS_CM** 即撞(**地面禁飞柱**)。
  - ⚠️ 实测发现:若用「圆柱体 XZ+Y 区间」判定,当 takeoff 高度=障碍高度时浮点边界会漏判撞机。故本轮采用**禁飞柱**(只判 XZ),「飞越障碍顶」作为高级玩法**延后**(届时按 heightCm 做 Y 判定)。`SimObstacle.heightCm` 字段保留作视觉/未来预留。
- **检测点放进 `emitTelemetry()` 内统一调用**——覆盖所有有遥测的阶段;`execute` 开头先 emit 一帧初始状态(3D 无人机回起点)并借此做起点碰撞检查。
- 撞机:`collided=true; aborted=true` 停飞,`events.push('💥 撞到障碍物')`。`execute` 末尾 `success = !aborted`。新增 public `hasCollided()` 供页面区分撞机 vs 手动停止。**不改 `RunResult`**。

### 缺口 2：结果面板 + 用时（改 `SimulatorPage.tsx` + 新增 `SimResultPanel.tsx`）
- `handleRun` 记 `startTime = performance.now()`;结束算 `elapsedSec`。
- 页面维护 `finishKind: 'success' | 'collision' | 'stopped'`,**在 `onFinish` 里**用 `adapter.hasCollided()` + `result.success` 推导(不只看 success)。
- `handleStop` **只停飞,不立即弹最终面板**;最终面板等 `onFinish` 回来(保证用时/日志一致)。
- 结果面板:大图标 + 标题(✅完成/💥撞到障碍/⏹已停止)+ 用时 + "重新运行";**入场用纯 CSS transition(fade+scale),不引入动效库**,`@media (prefers-reduced-motion)` 关闭动画。

### 缺口 3：轨迹性能（只改本范围的 `SimulatorPage.tsx`）
- `trail` 限最近 **≤300 点**(超出丢最旧),避免每帧重建超长 Line。
- ⚠️ `features/project/useProjectFlight.ts`(**A 的代码**)的 trail 同样无限累积——**不在本范围内,我不改,汇报里提醒 A**。

### 缺口 4：竞态防护（Codex 补漏,改 `SimulatorPage.tsx`）
"停止→立刻重跑"时旧 adapter 的 `onFinish` 可能覆盖新一轮。**照抄 `useProjectFlight` 的 `runIdRef` 模式**:每次 run `++runIdRef`,回调用 `live()` 闸门,新 run 先 stop 旧的。

### 缺口 5：移动端 + 截图
- 375px 工具栏/HUD 不破版(必要时 HUD 精简/换行)。
- 6+ 截图:飞行中、完成面板、撞机面板、不同视角、移动端、日志。

## 3. 明确延后（父 RFC 允许）
单步积木高亮、回放、按设计参数(重量/推重比)影响飞行、多任务计分。

## 4. skill / 技术栈结论
- 已搜社区 Three.js skill(最高 7.3K),因 PromptScript 不支持安装而降级;3D **复用现有 `FlightScene` 成熟 R3F 模式**,不新搭场景。
- 动效栈核实为 **framer-motion**;结果面板用**纯 CSS**(最简、零新依赖,Codex 明确不引入新动效栈)。
- `threejs-animation` skill 可选用于旋翼旋转小动效(锦上添花,非必须)。

## 5. 范围与红线
- **只动**:`simulator/SimAdapter.ts`、`pages/Simulator/SimulatorPage.tsx`、新增 `pages/Simulator/SimResultPanel.tsx`;可选微调 `FlightScene.tsx`(障碍高度对齐 heightCm 的视觉)。
- **不改 / 不碰**:`packages/shared`(IR/`DroneAdapter`/`RunResult` 红线,只 implements+消费)、`features/project/*`(A 的,含 useProjectFlight)、设计/编程界面。

## 6. 交付物 + DoD（含可验证断言）
- [ ] **必撞程序**:构造一条朝障碍直飞的 IR → `success=false` + 事件含撞机 + 无人机停在碰撞点附近 + 面板显示"撞到障碍"。
- [ ] **禁飞柱判定**:障碍为禁飞柱,无人机 XZ 进入柱体即撞;「飞越障碍顶」延后。
- [ ] **完成程序**:示例 IR → "完成! + 用时"。
- [ ] **手动停止**:显示"已停止",不误报撞机。
- [ ] **快速重跑**:停止后立刻重跑,旧 run 不覆盖新 run 结果。
- [ ] **trail ≤300**(本页);长飞不明显掉帧。
- [ ] 移动端 375px 可用;桌面正常;无 console 报错;typecheck/lint 本任务文件全绿;**未改 IR/Adapter/RunResult 契约**。
- [ ] 6+ 截图;独立分支 + PR + hash。

## 7. 测试计划
浏览器实跑:完成路径 + 必撞路径 + 手动停止 + 快速重跑;桌面 + 375px;看 console。

## 8. 停止点 🛑
编码 + 自检 + Codex 代码评审 + 截图齐全后,停下用大白话+点击路径汇报,等负责人决定合并。不自行合并。
