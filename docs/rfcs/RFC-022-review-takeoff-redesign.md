# RFC-022 — 搭建「检查/起飞」页改版（去土色 + 删电机步 + 起飞测试）

> 状态：实施中 · 分支 `feat/review-takeoff`（基于干净 `platform-2.0`）· 跨角色承接（原文档发给"设计流程工程师"，军师指派由我执行）
> 依据：`搭建检查页改版-去土色+删电机步-给设计流程工程师.md`（军师×Codex 两轮定稿）。本 RFC 只记录**落地决策与分期**，规格以原文档为准。

## 军师本轮拍板（在原文档基础上的两点收敛）
1. **套件只有 4 个电机/机臂** → `kitConfig.allowedMotorCounts = [4]`。机臂数必须 = 4，非 4 即非法；失败建议**绝不说"加机臂"**，只说"减装饰减重 / 调平衡"。原文档 §6 失败·动力文案固定取"减一点装饰更轻就能飞"。
2. **分两期做**（先稳妥、炫动画第二期）：
   - **本期（Phase 1）**：删假第 6 步 + 全程去土色 + 真实合格判定 `flightReadiness` + 起飞/起不来的明确提示 + 底部动作栏重排 + 体检面板儿童词 + 文案 + 6→5 步数。**不碰相机、不做电影级 3D 起飞动画**（上次相机自适应把零件搞缩小被回退，本期避开）。
   - **第二期（Phase 2，后续）**：3D 派生动力点（光环/螺旋桨/CW-CCW）+ 重心点 + 对称轴 + 电影级起飞演示（成功离地、失败按原因演不同样子）。

## 工程要点
- **共享契约改动隔离**：`registry.ts`(BUILD_STEPS/STEP_INFO/STEP_CATEGORIES) + `compatibility.ts` 的 6→5 改动，作为**独立首个提交**（标注"横切·交基建落主干"），其余前端改动跟在后面。交 5 号时：先把契约提交落主干、各模块 rebase，再落前端。这样既不把横切埋进 feature 分支、又能本地连贯开发。
- **电机数按真实连接派生（命门）**：不能 `parts.filter(category==='landing')` 数，要从主板沿 `PartInstance.attachedTo` 做可达性 BFS，只数真正连到主板的机臂——否则孤立机臂被误算成电机。
- **flightReadiness 返回结构化原因码**，不只返回文案；动画/UI 只读结果不重算规则。

## Phase 1 任务清单（验收对应原文档 §7）
1. [契约·隔离提交] `registry.ts`：`BUILD_STEPS` 去 `MOTOR`；`STEP_INFO.REVIEW = {label:'起飞检查',number:5,description:'检查动力、重量和左右平衡'}`，删 `MOTOR`；`STEP_CATEGORIES` 删 `MOTOR`。
2. [契约·隔离提交] `compatibility.ts`：去 `MOTOR` 分支；`getNextStep('REVIEW')=null`；`canAdvanceStep(REVIEW)` 不再承担"完成"。跑 parts-schema 单测。
3. [前端] 新增 `utils/flightReadiness.ts`：`{ motorPlan, issues[], canTakeoff, primaryFix }`；`allowedMotorCounts=[4]`；BFS 真实连接数机臂；优先级 结构缺失 > 机臂数非法 > 不对称 > 超重 > 动力不足。
4. [前端] `designStats.ts`：推重比改 `motorPlan.motorCount × STANDARD_MOTOR_THRUST_G / totalWeightG`；`totalWeightG≤0` → ratio `null`。
5. [前端] `StepActions.tsx`：最后一步判定改 `getNextStep(currentStep)===null`；主按钮 `起飞测试`(≥52–56px，天空蓝实心)→`onRunFlightTest`；移除底栏`保存并导出`；次按钮`保存草稿`；去 wood/paper；失败显示具体阻塞文案。
6. [前端] `ReviewStep.tsx`：儿童词（身体轻不轻/动力够不够/左右平不平/能飞多久）+ 数据不全→动作提示；总判定接 `flightReadiness`；失败色用蓝/珊瑚红（**不用金黄/琥珀**）；空设计→占位+"先装主板和 4 个起落架"；通过后才出「完成/AR 试飞/导出清单」。
7. [前端] `GuidedDesignPage.tsx`：删 `isMotorStep` 分支与 `MotorInstallStep` 引用；去 paper 底色。
8. [前端] 删除 `MotorInstallStep.tsx`。
9. [前端] `DesignListModal.tsx`：`/6`→`/5`、`reached>=6`→`>=5`。`designStore.ts` 旧设计兼容 `stepReached:6`→`5`。
10. [前端] 文案按原文档 §6（失败·动力固定"减一点装饰更轻就能飞"）。
11. [测试] `flightReadiness` 单测：0 机臂 / 奇数(非4) / 4机臂超重 / 动力不足 / 不对称 / 孤立机臂(没连主板) / 通过；`primaryFix` 按优先级。`pnpm --filter web lint && typecheck` 绿；改 parts-schema 跑其单测。

## 红线
不改色调（统一天空蓝，警告不用金黄/琥珀，金色只留星星/徽章）；不动 IR；不删 GLB/CAD；本期不碰相机/不重算几何口径（不虚构强度/续航）；缺图找军师；push 交 5 号不自己合。
