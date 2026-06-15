# RFC-013 — 设计作品持久化到账户（localStorage → 后端）

> **状态**：草案 v0.1（待存储方案拍板 + 契约对齐 + 人类确认 schema 变更，再执行）
> **作者**：后端工程师（Claude Code）
> **日期**：2026-06-16
> **分支**：`feat/platform-2.0`
> **关联**：RFC-011（平台 2.0 基准架构，当前 M5）；依赖 RFC-012 A6（storage 适配层，缩略图上传用）
> **角色边界**：本人只做 `apps/api` + `@fwx/shared` 契约；前端 `apps/web` 改造由前端工程师执行，本 RFC 提供契约并配合

---

## 0. 评估结论（先回答「能否实现」）

**能实现，且后端已完成约 60%。** 不是从零造后端，而是补缺口 + 对齐契约 + 前端切换。

| 模块 | 现状 | 缺口 |
|---|---|---|
| 后端 `/api/drone-designs` CRUD | ✅ 已就绪（`DroneDesign` model 带 `ownerId`，附属账户） | 契约不全、无幂等 upsert |
| 设计「写入」后端 | 🟡 `useDesignSync` 有 debounced 保存 | `params` 是假数据，`buildMode/currentStep/stepReached/safetyCheck` 未存 |
| 设计「登录读回填」 | ❌ **完全没实现**（注释说有，代码没有） | 这是用户需求「下次登录读取」的核心 |
| 数据契约一致性 | ❌ 前端 `Design` ≠ 后端 `DroneDesign` ≠ `@fwx/shared` | 必须对齐 |
| 缩略图 | ❌ 前端 `thumbnail` 未持久化 | 依赖 RFC-012 A6 storage + `/upload` |

---

## 1. 背景与现状

### 1.1 设计现在存在哪
前端 `designStore.ts` 用 zustand `persist` 存浏览器 `localStorage`（key `STORAGE_KEYS.DESIGN_STORE`）。换浏览器/清缓存即丢，不附属账户。

### 1.2 三方契约差异（核心矛盾）

| 字段 | 前端 `Design`（types/design.ts） | 后端 `DroneDesign`（@fwx/shared + model） |
|---|---|---|
| name | ✅ | ✅ |
| parts | ✅ `PartInstance[]`（instanceId/attachedTo/connector…） | 🟡 mongoose 用 `Mixed` 兜底，类型不明 |
| buildMode / currentStep / stepReached | ✅（引导式搭建进度） | ❌ 无 |
| safetyCheck | ✅（重量/重心/对称等） | ❌ 无（只有 `weightG`） |
| thumbnail | ✅（前端有） | 🟡 `thumbnailUrl`（URL，需上传） |
| params（ParametricBodyParams） | ❌ 无 | ✅（但前端同步时填的是假值） |
| ownerId / status / 时间戳 | ❌（本地无 owner 概念） | ✅ |

**结论**：后端模型是「参数化机身（params）」视角，前端实际是「零件实例 + 搭建进度」视角，两者错位。直接同步会丢数据。

---

## 2. 目标与非目标

### 2.1 目标
1. 设计**附属账户**（`ownerId`），不再只存浏览器。
2. **任意设备登录可读**：A 设备保存的设计，B 设备登录同账户能完整打开（零件、搭建进度、名称、缩略图齐全）。
3. **不丢搭建状态**：`buildMode/currentStep/stepReached/safetyCheck` 完整保存与还原。
4. **幂等**：同一设计重复保存不产生重复记录（CLAUDE.md §3.3 学校网络不稳，幂等优先）。
5. **游客模式**仍走本地，不入账户。

### 2.2 非目标
- ❌ 不做实时多端协同编辑（本期只做「保存/读取」，不做冲突合并）。
- ❌ 不做服务端理解/校验设计内容（存取即可，结构化分析后置）。
- ❌ 不动其他补救项（课程/改密码等，另议）。

---

## 3. 方案设计

### 3.1 存储模型：两个方案（需拍板，见 §8-Q1）

**方案 A — 结构化扩展 `DroneDesign`**
把 `buildMode/currentStep/stepReached/safetyCheck/parts(PartInstance)` 全部加进 `@fwx/shared` + mongoose schema，逐字段落库。
- ✅ 类型安全、可服务端查询
- ❌ 前端设计结构一变，后端 schema 跟着改；2.0 仍在演进，耦合代价高

**方案 B — 快照 + 索引字段（推荐）**
后端存一个 `designData`（完整前端 `Design` 快照，JSON）+ 少量「索引/展示」字段（`name/thumbnailUrl/weightG/status/ownerId/localId/时间戳`）。
- ✅ 前端结构演进不影响后端；解耦；最快满足需求
- ✅ 后端现状已是「半个方案 B」（`parts` 已用 Mixed）
- ❌ 后端不理解设计内容（但「存取设计」需求够用；将来要服务端分析再结构化）

> 推荐 **B**：契合用户需求（存取 + 附属账户 + 跨设备读取），不被前端结构绑架，符合 CLAUDE.md §2「不过度设计」、§3.3「先让能用」。

### 3.2 方案 B 的契约草案（`@fwx/shared` 调整，待对齐 §8-Q2）

```ts
export interface DroneDesign {
  id: string;
  ownerId: string;
  name: string;
  designData: unknown;        // 新增：前端 Design 完整快照（本期 unknown，后续可收紧）
  thumbnailUrl?: string;
  weightG: number;            // 从 safetyCheck.totalWeightG 取，作列表展示/排序
  status: DroneDesignStatus;
  localId?: string;           // 新增：前端本地 id，用于幂等 upsert
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
// params 改为可选保留（向后兼容存量数据），不再要求前端提供
```

### 3.3 幂等 upsert（关键）
现状 `useDesignSync` 用 `sessionStorage` 存 localId→serverId 映射，刷新/换设备即丢 → 会**重复创建**。
方案：后端按 `(ownerId, localId)` **upsert**——首次创建、之后更新。需要 `(ownerId, localId)` 复合唯一索引（§8-Q3 确认）。

### 3.4 缩略图
依赖 RFC-012 A6 storage 适配层 + 新增 `POST /api/upload`（返回 `{url}`）。前端上传缩略图拿到 URL，存进 `thumbnailUrl`。A6 未完成前，缩略图可暂缺（不阻塞核心存取）。

---

## 4. 接口契约草案（待统筹窗对齐 §8-Q2）

> 沿用现有 `/api/drone-designs` 前缀，全部需 JWT，按 `ownerId` 隔离。响应统一 `{ design }` / `{ designs }`。

| 方法 | 路径 | 请求 | 响应 | 备注 |
|---|---|---|---|---|
| GET | `/api/drone-designs` | — | `{ designs: DroneDesign[] }` | 列表，含 `designData` 供回填 |
| GET | `/api/drone-designs/:id` | — | `{ design }` | |
| PUT | `/api/drone-designs` | `{ localId, name, designData, weightG, thumbnailUrl? }` | `{ design }` | **幂等 upsert by (ownerId, localId)**，替代易重复的 POST |
| PATCH | `/api/drone-designs/:id` | 部分字段 | `{ design }` | 按 serverId 更新 |
| DELETE | `/api/drone-designs/:id` | — | `{ message }` | |

---

## 5. Schema 变更（需人类确认 — CLAUDE.md §3.5 红线）

> §3.5 明确「不要在未经确认的情况下动 MongoDB 的索引和集合结构」。本节须经你确认再执行。

1. `DroneDesign` 新增字段：`designData`（Mixed）。**加字段，不删不改现有字段**，对存量数据安全（旧文档该字段为空）。
2. 新增 `(ownerId, localId)` **复合唯一索引**（sparse，仅 localId 存在时生效），支撑幂等 upsert。⚠️ 这是改索引，须你点头。
3. `params` 由 required 改 optional（向后兼容）。

---

## 6. 分工

| 任务 | 后端（我） | 前端（非我） | 协作 |
|---|---|---|---|
| `@fwx/shared` 契约调整 | ✅ | 引用 | 对齐统筹窗 |
| mongoose schema + 索引 | ✅（确认后） | — | |
| CRUD + 幂等 upsert | ✅ | — | |
| `/upload` + storage(A6) | ✅ | — | 依赖 RFC-012 |
| 契约文档 | ✅ 产出 | 依此对接 | |
| designStore 改后端主存 + 登录回填 + 接入真实 params/buildMode | — | ✅ | 我配合调试 |
| 端到端联调 | ✅ 后端侧 | ✅ 前端侧 | |

---

## 7. 分阶段任务（一项一项执行）+ 停止点

| # | 任务 | 执行 | 停止点 🛑 |
|---|---|---|---|
| T1 | 拍板存储方案（A/B）+ 确认 schema 变更 + 契约对齐 | 你 / 统筹窗 | 🛑 未拍板不动代码 |
| T2 | 调整 `@fwx/shared` 的 `DroneDesign` 类型（+ 跑其单测） | 我 | |
| T3 | `DroneDesign` mongoose schema 加 `designData` + 复合唯一索引 | 我（确认后） | |
| T4 | CRUD 完善：幂等 `PUT` upsert、列表返回 `designData` | 我 | |
| T5 | `POST /api/upload` + storage 适配层（A6） | 我 | 可与前端并行 |
| T6 | 产出接口契约文档，交付前端 | 我 | 🛑 前端据此对接 |
| T7 | designStore 改造 + 登录回填 | 前端 | |
| T8 | 端到端联调 + 验收（见 §9） | 双方 | |

---

## 8. 待确认问题

- **Q1 存储方案**：A 结构化 / **B 快照（推荐）**？
- **Q2 接口契约**：§4 草案是否 OK？由统筹窗与前端确认请求/返回格式（§3.4）。
- **Q3 索引**：批准新增 `(ownerId, localId)` 复合唯一索引（§3.5 红线）？
- **Q4 缩略图**：本期是否做？（依赖 RFC-012 A6；不做不阻塞核心存取）

---

## 9. 量化验收标准

- [ ] 账户 A 在浏览器1 创建设计 X（搭建到第 3 步 + N 个零件 + 命名）→ 浏览器2（或清缓存）登录 A → 能看到并打开 X，**零件 / 搭建进度 / 名称完整还原**
- [ ] 同一设计连续保存多次，后端**只有一条记录**（幂等）
- [ ] 游客模式设计**不**进账户（仍本地）
- [ ] 删除设计后，重新登录不再出现
- [ ] `pnpm --filter @fwx/shared test` 全绿（改了 shared）；`pnpm lint` 全绿

---

## 10. 风险与回滚

| 风险 | 缓解 |
|---|---|
| 改 `@fwx/shared` 影响 M2 既有逻辑 | 改动前跑 shared 单测；`params` 保留可选向后兼容 |
| 存量 localStorage 设计迁移 | 首次登录把本地设计 upsert 到后端（前端一次性迁移），保留本地副本兜底 |
| schema 变更不可逆 | 只加字段 + sparse 索引，不删不改；上线前在测试库验证 |
| 前端结构演进 | 方案 B 用快照解耦，后端不随之改 |

---

> **下一步**：T1 拍板（存储方案 + schema + 契约）→ 我执行 T2–T6 后端部分 → 交付契约给前端做 T7。建议 T1 后过 Codex 评审①再进 T2。
