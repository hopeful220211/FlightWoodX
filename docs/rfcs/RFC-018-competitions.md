# RFC-018 · 赛事板块优化（2 号工程师）

| 字段 | 值 |
|---|---|
| 状态 | Draft（待人类确认 + 开工） |
| 负责 | 2 号工程师 |
| 关系 | 锚定 [RFC-011](RFC-011-platform-2.0-architecture.md) D1（赛事/赛季）/ D2（赛道 Scene）/ D3（评分/排行/回放）/ D4（赛事 Admin）；**消费 [RFC-016 契约](RFC-016-platform-shared-contracts.md)**；**P1 依赖 [RFC-015 仿真](RFC-015-sim-flight.md)**。 |
| 定位 | **赛事 = 基于 Project + Scene + RunResult 的竞赛组织与成绩层。** 不拥有仿真器、不定义 Scene/RunResult、不把评分写进前端。 |

> **一句话**：让学生报名赛事、提交作品、看排行与回放；纯线上即可办最小可行赛事（对标 VEX Virtual Skills）。

---

## 1. 现状（调研核实）
- UI 四页**全占位**：列表（两个 hardcoded demo 赛事）、详情（"M6 接入"占位）、提交（disabled）、排行榜（空图占位），**零 API 调用**。
- `Competition`（含 `trackConfig/scoringRules/status`）、`Submission`（含 `simReplayUrl`）、`Score`（含 `dimensions/total/source`）模型有，但**零路由零 API**（`server.js` 未挂载 competitions/submissions/scores）。
- **与 RFC-015 断层**：现 `RunResult` 仅 `{success,score,events}`，无回放/物理；Scene 抽象不存在；`RunResult→Score` 评分管道不存在。

## 2. 消费的共享契约（来自 RFC-016，禁止自造）
2.1 分页 · 2.3 提交（`submit(projectId,competitionId)→Submission`）· 2.4 分享/回放 · 2.5 Scene/Rubric/RunResultExt（**占位，随 RFC-015**）· 2.6 Submission/Score 状态机 · 2.11 列表 UI。

## 3. 目标与功能（对照功能导图赛事点）
| 功能 | 阶段 |
|---|---|
| 赛事列表 / 详情（真实数据、报名数） | **P0** |
| 报名参加比赛 | **P0** |
| 提交作品参赛（Submission 只引用 Project） | **P0** |
| 排行榜（只读 Score，可先人工/seed 数据） | **P0** |
| 赛制/赛道/评分说明展示 | **P0** |
| 接入仿真自动评分（RunResult×rubric→Score） | P1（依赖 RFC-015） |
| 回放观战（每个成绩可一键回放） | P1（依赖 RFC-015） |
| 赛季制 / 赛道 Scene 可插拔 | P1 |
| 赛事 Admin 复核台 / 排行发布（D4） | P1（衔接 RFC-014） |
| 带班级参赛（F1） | P2 |

## 4. P0 收口清单
1. 建真实赛事 API 骨架：`list / detail / register / submit / leaderboard`。
2. `Competition` 的 `trackConfig/scoringRules` **迁移方向改为 `sceneId / rubric`**（对齐 RFC-011 D2/D3），但**自动评分先挂起**。
3. `Submission` **只接受 Project + 记录状态**（走 §2.6 状态机），**不伪造 RunResult、不"提交即有分"**。
4. `Leaderboard` 只读 `Score`；`Score` 可先支持人工/seed 数据，但字段兼容未来自动评分。
5. 删除两个 hardcoded demo 赛事，接真实数据（无赛事时走空态）。

## 5. UI / 交互（沿线上 sky-blue + fwx-motion）
- 列表：赛事卡（状态标签即将开放/进行中/已结束 + 真实报名数）。
- 详情：赛制/赛道/评分说明 + 报名/提交 CTA + 排行入口。
- 提交流程：选自己的 Project → 确认 → 进 §2.6 状态机。
- 排行榜：名次/选手/分数 + 回放入口（P1 可点）。
- 三态 + 分页；动效用 `fwx-motion`。

## 6. 板块特有 API（`/api/competitions/*`）
`GET /competitions`（分页）· `GET /competitions/:id` · `POST /competitions/:id/register` · `POST /competitions/:id/submit`（projectId）· `GET /competitions/:id/leaderboard`。

## 7. 分期 / 验收 / 停止点
- [ ] **P0**：真实赛事 list/detail/register/submit/leaderboard，状态机跑通。**验收：能报名一个赛事、提交一个 Project、在排行榜看到条目（分数可人工）。无 demo 硬编码、无假自动评分。** 🛑
- [ ] **P1**（依赖 RFC-015）：Scene/RunResultExt/ScoringEngine、自动评分、回放观战、Admin 复核、赛季制。🛑

## 8. 边界提醒（防越界/分叉）
- ❌ 不拥有仿真器、不定义 Scene/RunResult（用 RFC-015/RFC-016）。
- ❌ **不做假自动评分闭环**——没有 Scene+RunResultExt 时只做提交流程 + 人工/seed 分数。
- ❌ 提交逻辑不混进 `/projects`，走 `/api/competitions/*`。
- ✅ Submission/Score 第一版就用 §2.6 状态机，字段兼容未来自动评分。

*— RFC-018 v0.1 · 2026-06-16 · 锚定 RFC-011 + RFC-016 + RFC-015 —*
