# RFC-014 — 上线就绪补强（体检 Top 1–8）· v0.2

> **状态**：修订中（v0.1 经 Codex 评审① 发现"基于过期代码"，本 v0.2 已按真实现状 + Codex 意见重写，待 Codex 复评 → 执行）
> **作者**：Claude Code（本工程开发总监）｜**日期**：2026-06-16｜**分支**：`feat/platform-2.0`
> **来源**：`docs/backend-readiness-audit-2026-06-16.md` Top 1–8
> **v0.2 关键修订**：前端 W1/W2 已被实现（验收非开发）；W4 实为删死代码；W7 降级；新增 IR 后端校验 + 冒烟测试。

---

## 0. 真实现状校准（v0.2 的基石）

体检后前端又推进了，核对代码确认：

| 项 | v0.1 以为 | 真实现状（已核对） |
|---|---|---|
| W1 编程保存 | ❌ TODO 假保存 | ✅ **已实现**：`CodingPage` 接 `createProgram/updateProgram`、进入页 `getPrograms` 回填、`programStore.serverId` 防重复 |
| W2 设计回填 | ❌ 只写不读 | ✅ **已实现**：`useDesignSync.loadFromServer` + `getDroneDesigns` 跨设备还原 |
| W4 死接口 | 前端调了后端没有→静默失败 | 实为 `api.ts` **未用 helper**（无运行调用）→ 删死代码即可，不必补后端 |

→ 工程量大幅缩小。本 RFC 真正要"开发"的只剩后端 4 项 + 前端清理/验收 + 运维。

---

## 1. 修订后工作清单（按真实状态）

| 编号 | 工作项 | 真实性质 | 负责 |
|---|---|---|---|
| W1 | 编程保存 | **验收**（实测+修潜在 bug，不重写） | FE 验收 |
| W2 | 设计回填 | **验收**（含跨设备冲突规则） | FE 验收 |
| W3 | 列表分页 | 开发（**正式分页，非假兼容**） | BE + FE 接入 |
| W4 | 清理死 helper | 删代码（`api.ts` 未用导出） | FE |
| W5 | 改密码接口 | 开发（后端） | BE |
| W6 | 公开作品查询 | 开发（**匿名可读 + 白名单字段**） | BE + FE |
| W7 | 试飞存档 RunResult | **降级/砍**（本期不存档，见 §3） | — |
| W8 | 线上凭证轮换 | 运维（+回滚步骤） | 人类 |
| **W9** | **IR 后端校验**（新增，Codex Blocker） | 开发（后端） | BE |
| **W10** | **冒烟测试 + 最小日志**（新增，Codex 建议） | 开发（后端） | BE |

---

## 2. 各项方案（修订要点）

### W1 编程保存 — 验收
- 跑真实场景：放 N 积木→保存→离开→重进/刷新→**完整还原**；连续保存只 1 条记录。
- 查潜在 bug：进入页 `getPrograms` 取"最新"程序的逻辑在**多程序**时是否正确（当前 `programStore` 是单程序模型，确认产品本期就是"一个用户一个当前程序"，否则标记已知限制）。
- 不重写已有实现。

### W2 设计回填 — 验收
- 跨浏览器：账号 A 浏览器1 改设计 → 浏览器2 登录 → 还原。
- **冲突规则**（Codex 提）：`designStore.importServerDesigns` 按 `updatedAt` 合并；验收"两浏览器分别改同一设计"——保证**不静默覆盖更晚版本**。游客不入账户。

### W3 列表分页 — 正式分页（不假装兼容）
- Codex Blocker：保留 `{projects:[...]}` 只是形状兼容，默认第一页会**静默少数据**，比破坏更危险。
- **定调**：列表正式进入分页，前端必须接 `total/page/limit/totalPages/hasNext` + 翻页/加载更多 UI。
- 后端：`?page=1&limit=20`（limit 钳制 ≤100），`countDocuments` + `skip/limit`，**保留现有排序**（projects `createdAt:1`；programs/drone-designs `updatedAt:-1`）。返回 `{ items字段, total, page, limit, totalPages, hasNext }`（`items字段`沿用 `projects`/`designs`/`programs` 名）。
- 验收边界：`page<=0`、`limit<=0`、非数字、超大 limit、最后一页、空集、越界页、排序稳定。
- 范围：`/projects`、`/drone-designs`、`/programs`、`/admin/users`。

### W4 清理死 helper — 删代码
- 删 `api.ts` 未用导出：`getCourses/getCourse/getUserDesigns/getDesign/createDesign/updateDesign/deleteDesign/getPublicDesigns/uploadFile/updateUser`（**删前逐个 grep 确认无 import**）。
- `changePassword`：**不删**——待 W5 后端就绪后接通（前端有改密码入口则复用）。
- **保留** `exportDesignCad`（对应合法的 `/designs/:id/export-cad`）。
- 验收：grep 确认无"运行路径"调用不存在的接口；未用 helper 已删或标 deprecated。

### W5 改密码 — 后端
- `POST /api/auth/change-password`（登录）`{oldPassword,newPassword}`：校验旧密码→bcrypt 新密码→保存；`newPassword`≥6 且 ≠ 旧密码。
- 验收（Codex 补全）：未登录→401；旧密码错→401；新旧相同→400；成功后响应**不含 password**、旧密码失效、新密码可登录。
- 不做 JWT 吊销（无状态），明确"旧 token 过期前仍有效"。前端有入口则接 `changePassword`。

### W6 公开作品 — 匿名可读 + 白名单
- Codex：公开作品若要登录则分享价值弱。**放 `authenticate` 之前**（或单独 public router）。
- `GET /api/projects/public?page&limit`：仅 `visibility:'public'`，分页；**白名单字段**：`id/name/coverUrl/visibility/createdAt/updatedAt/authorDisplayName`——**不返回** email、owner 全对象、private 项目、design/program 原始内容。
- 验收：只返 public；含封面+作者名；无敏感字段；未登录可访问。

### W9 IR 后端校验（新增）
- Codex Blocker：`POST/PATCH /api/programs` 现仅判断 `commandProgram` 存在（[programs.js](../../apps/api/src/routes/programs.js)），非法 IR 会入库、后续适配器才炸。
- **方案 (a)（Codex 复评定稿）**：给 `@fwx/shared` 加 CJS 构建，api `require` 用 `CommandProgramSchema.safeParse` 校验。绝不改 CommandProgram 结构、不在 api 内重复定义。最小路径：
  1. `packages/shared` 用 `tsup` 构建 CJS 到 `dist-cjs/`；`exports` 保留 `.` → `./src/index.ts`（前端不变），**新增** `./runtime-cjs` → `{ require: ./dist-cjs/index.cjs }`。
  2. `apps/api/package.json` 加依赖 `@fwx/shared: workspace:*`。
  3. api：`const { CommandProgramSchema } = require('@fwx/shared/runtime-cjs')`。
  4. **更新 Dockerfile**：copy `packages/shared` 并带入 `dist-cjs`（现 Dockerfile 没 copy shared，不补会生产启动失败）。
- **交付物**：shared CJS 构建 + api 依赖 + programs 校验 + 更新 Dockerfile + 构建/启动验证。
- 验收：非法 IR `POST` → 400；合法仍通过；不破坏现有数据。

### W10 冒烟测试 + 最小日志（新增）
- 冒烟脚本（可重复）：注册→登录→存取设计→存取程序→项目 CRUD→公开作品分页→改密码→改密码后登录。一条命令跑完报通过/失败。
- 最小日志：500 错误、慢接口（>Nms）、Mongo 断连可定位（结构化即可，不上重型方案）。

### W7 试飞存档 — 降级（本期不做）
- Codex：审计本说"Top 1–6 即可上线"，且 shared `RunResult` 现为 `{success,score?,events}`，不含 `trajectory/telemetry`；硬上新 collection 扩大契约/存储/隐私面。
- **本期决策**：**不做后端存档**。前端文案不承诺"历史回放"。若首发必须回放，另起独立 `SimulationRun` 契约（不挤压现有 `RunResult` 语义），单独立项。（§4-Q2 待确认）

### W8 凭证轮换 — 运维（人类）+ 回滚
- 清单：轮换 Atlas 密码 / `JWT_SECRET`（⚠️换后全员重登，选低峰+公告）/ `ADMIN_ACCESS_KEY` / 作废旧 `AI_API_KEY`。
- **回滚步骤**（Codex 补）：每项记旧值，换错可回退；`MONGODB_URI` 换错直接 503。
- 验收：旧凭证失效 + 健康检查 200 + DB connected + 一次关键写入成功。

---

## 3. 分阶段 + subagent 分工（按 Codex 风险调整）

```
Phase 0  本 v0.2 → Codex 复评 → 执行
Phase 1  后端开发（projects.js 涉及 W3+W6 → 同文件串行；其余可并行）
         ├ subagent-BE1：W5 改密码 + W6 公开作品 + W3 分页（projects/drone-designs/programs/admin）
         └ subagent-BE2：W9 IR 校验（含 shared 构建评估） + W10 冒烟/日志
         ↓ 后端产出 + 契约文档 → Codex 评审②
Phase 2  前端（api.ts 由一个 subagent 集中改，避免冲突）
         └ subagent-FE1：W1/W2 验收 + W4 删死 helper + W3 分页解包&翻页 UI
         ↓ → Codex 评审②
Phase 3  端到端联调 + §5 验收逐条 + lint/typecheck/shared test 全绿 + 冒烟通过
Phase 4  汇报；W8 由人类并行
```
- **冲突规避**（Codex）：后端契约先定稿；`api.ts` 单人集中改；同文件（projects.js）串行；必要时 `using-git-worktrees`。

---

## 4. 待确认问题
- **Q1（W9）**：IR 后端校验走 (a) 给 `@fwx/shared` 加构建（推荐）还是 (b) 后端轻量 validator？前者更正但要动 shared 构建。
- **Q2（W7）**：试飞本期确认**不存档**？（除非首发要回放）
- **Q3（W3）**：确认正式分页（前端接 hasNext + 翻页 UI），不走假兼容？
- **Q4（W6）**：公开作品**匿名可读**确认？

---

## 5. 量化验收总表
- [ ] W1 积木重进还原、不重复建记录（实测）
- [ ] W2 跨浏览器还原 + 冲突不静默覆盖 + 游客不入账户
- [ ] W3 正式分页：边界全过、total/totalPages/hasNext 正确、排序保留、前端翻页 UI 可用
- [ ] W4 grep 无运行路径死接口调用；未用 helper 已删
- [ ] W5 改密码：未登录401/旧错401/新旧同400/响应无password/新密码可登录
- [ ] W6 公开作品：仅 public、含封面+作者、无敏感字段、匿名可访问
- [ ] W9 非法 IR 被拒（400）、合法通过、不破坏现有数据
- [ ] W10 冒烟一键通过；500/慢/断连可定位
- [ ] W3 索引：projects(ownerId/createdAt)、programs/drone-designs(ownerId/updatedAt)、projects(visibility+createdAt) 有合适前缀索引，分页不退化为慢查询
- [ ] W6 字段转换：`_id→id`、作者名 `profile.displayName||username||'FlightWoodX 用户'`、不透传 user 全对象
- [ ] W9/部署：`docker build` + 启动能跑（引入 shared 后不挂）
- [ ] W8 凭证轮换 + 健康检查 200 + DB connected（人类）
- [ ] 全局 `pnpm lint && pnpm typecheck` + `@fwx/shared test` 全绿

---

## 6. 停止点 🛑
① Codex 复评通过再执行；② W9 若动 shared 构建，先小验证不破坏前端；③ 每 Phase 验收不过不进下一 Phase。

---

> 下一步：交 Codex 复评本 v0.2（确认 Blocker 已解），通过后进 Phase 1。
