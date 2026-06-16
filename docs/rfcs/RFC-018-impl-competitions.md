# RFC-018-impl · 赛事板块 P0 实现子 RFC（2 号工程师）

| 字段 | 值 |
|---|---|
| 父 RFC | RFC-018（赛事）· 消费 RFC-016 契约 |
| 分支 | `feat/rfc-018-competitions`（基于 `feat/platform-2.0`，已带入军师 RFC-016 契约切片） |
| 范围 | **仅 RFC-018 P0**：真实赛事 list/detail/register/submit/leaderboard + §2.6 状态机；不做自动评分/回放/Admin/赛季（P1） |
| 状态 | 待 Codex 计划评审 |

## 1. 现状（已核实）
- `@fwx/shared`：已带入 §2.6 `SubmissionStatus` 状态机 + `Submission`/`Score`，`api.ts` 有 `Paginated<T>`/`PaginationQuery`，`social.ts` 在（赛事 P0 用不到，P1 回放才用）。
- api：`Competition`/`Submission`/`Score` Mongoose 模型在，但 **`Submission` 无 `status` 字段**；**`server.js` 未挂赛事路由**；无报名模型。
- web：4 页占位，`CompetitionsPage` 有 2 个 **hardcoded demo**，零 API 调用。

## 2. 红线 / 边界（RFC-018 §8）
- ❌ 不拥有仿真器、不定义 Scene/RunResult；不做**假自动评分闭环**（无 Scene+RunResultExt 时只做提交流程 + 人工/seed 分）。
- ❌ 提交逻辑只走 `/api/competitions/*`，不混进 `/projects`。
- ✅ Submission/Score 第一版即用 §2.6 状态机；类型只 import `@fwx/shared`，不在 api/web 重定义（护栏#1）。
- ✅ 删 demo 硬编码，接真实数据，无赛事走空态（护栏#3）。

## 3. 后端改动（apps/api）
| 文件 | 改动 |
|---|---|
| `models/Submission.js` | 加 `status`（enum = §2.6：submitted/running/scored/reviewed/published/rejected，default `submitted`）。 |
| `models/Registration.js`（新增） | `{ competitionId, userId, createdAt }` + 唯一复合索引（防重复报名）。**板块特有**，非共享契约，故定义在 api。 |
| `routes/competitions.js`（新增） | 见 §4。 |
| `server.js` | 挂 `app.use('/api/competitions', competitionRoutes)`。 |
| `scripts/seed-competitions.js`（新增） | 幂等 seed：建 1–2 个**真实**赛事（替代前端 demo）；可选 seed 一条 Score 让排行榜有条目（§4 允许人工/seed）。 |

## 4. API（`/api/competitions/*`，对齐 RFC-018 §6）
| 方法 路径 | 鉴权 | 行为 |
|---|---|---|
| `GET /` | 公开 | 分页列表（`page/pageSize`）。返回 competitions + 每个的报名数 `registeredCount`。 |
| `GET /:id` | 公开（可选带 token） | 详情 + `registeredCount` +（若已登录）`isRegistered`。 |
| `POST /:id/register` | 需登录 | 幂等报名：无则建 Registration，有则直接 200。 |
| `POST /:id/submit` | 需登录 | body `{ projectId }`；校验 Project 属当前用户；建 Submission `status='submitted'`、`runId` 不写、**不产 Score**。 |
| `GET /:id/leaderboard` | 公开 | 读 `Score`（join Submission→user/project），按 `total` 降序，分页。无分则空。 |
- 响应形状对齐 `@fwx/shared`：Submission 带 `status`；列表走 `Paginated<T>`（`{ items,total,page,pageSize }`）。
- 错误处理沿 projects.js：try/catch + console.error + 合适状态码 + 中文 message。

## 5. 前端改动（apps/web）
| 文件 | 改动 |
|---|---|
| `hooks/useCompetitions.ts`（新增） | 封装 list/detail/leaderboard 拉取 + register/submit 动作（用现有 `apiFetch`）。 |
| `pages/Competitions/CompetitionsPage.tsx` | **删 `sampleCompetitions`**；接 `GET /`；三态（骨架/空/错）+ 分页；状态标签由真实 `status` 映射（draft→筹备中 / open→即将开放 / running→进行中 / closed→已结束）；真实报名数。 |
| `CompetitionDetailPage.tsx` | 接 `GET /:id`；赛制/赛道/评分说明；报名 / 提交 CTA；排行入口。 |
| `CompetitionSubmitPage.tsx` | 选自己的 Project → 确认 → `POST /:id/submit`（进状态机）；成功提示。 |
| `LeaderboardPage.tsx` | 接 `GET /:id/leaderboard`；名次/选手/分数；回放入口 P1 先 disabled。 |
- 视觉沿线上 sky-blue 组件（PageContainer/PageHeader/Card/Badge/Button）；动效用 `fwx-motion`（克制：列表入场轻量）。
- 三态 + 分页（护栏#5）。

## 6. 不做（P1，避免越界/假闭环）
- 自动评分（RunResult×rubric→Score）、回放观战、赛季制、Admin 复核台 —— 依赖 RFC-015，本轮不做。
- `Competition` 的 `trackConfig/scoringRules → sceneId/rubric` 迁移：RFC-018 §4.2 要求"方向改为"，但**自动评分先挂起**；本轮**不破坏**现有字段，仅在新代码里不依赖它做评分。先不强迁，避免连带改动，留 P1 + 军师契约对齐时统一。

## 7. 自检 / DoD（RFC-018 §7 P0）
- [ ] 能报名一个赛事、提交一个 Project、排行榜看到条目（分数人工/seed）。
- [ ] 无 demo 硬编码、无假自动评分；提交只引用 Project + 走 §2.6 状态机。
- [ ] typecheck / lint(本任务文件) / build 全绿；类型只 import 不重定义。
- [ ] 列表三态 + 分页；375px 不破版。
- [ ] playwright 6+ 截图（列表/详情/提交/排行/空态/移动端）。

## 9. Codex 计划评审采纳（2026-06-17）
**同意，收紧 4 处：**
1. 防漂移：api 为 CommonJS、无法运行时 import shared（TS 无构建产物）。故状态枚举在 api 侧定义为**一处常量** + 注释"镜像 @fwx/shared §2.6，保持同步"（临时策略，明示）；路由出参做 **DTO**：`_id→id`、`Date→ISO string`，真正对齐 shared 形状。
2. 报名校验赛事**状态/时间窗**（仅可报名状态）。
3. 提交**幂等**：唯一索引 `{competitionId,userId,projectId}`，重复返回已有 200。排行榜要有条目→**seed 造"赛事+提交+人工 Score"**；评分不进 submit 路径（杜绝提交即有分）。
4. **不硬加** `sceneId/rubric` 到 DB（否则违反"先改 shared 契约"）；P0 不依赖旧字段做评分，迁移留 P1 + 契约对齐。
5. 补 `optionalAuth`（GET /:id 带 token 不强制失败）。replay 入口 disabled，不作核心路径。

## 8. 停止点 🛑
P0 完成 + Codex 代码评审 + 截图后，**推云端备份、不自己合并**；自动评分/回放等 P1 停下等 RFC-015 + 人类确认。
