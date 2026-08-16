# RFC-014a · 后台 P0 开发契约附录（API / DTO / RBAC）

| 字段 | 值 |
|---|---|
| 状态 | Draft（实现契约层，供前端直接落地） |
| 作者 | 程楷迪（Corty） / 军师代笔 |
| 日期 | 2026-06-16 |
| 关系 | **[RFC-014 后台管理系统](RFC-014-admin-console.md) 的实现契约层**。RFC-014 定"做什么模块"，本附录把 **P0（A-M0~A-M3：地基审计 / 用户角色 / 课程 / 零件）的 API、DTO、RBAC 权限码定死**，消除 Codex 复审指出的"契约不足以交付开发"。 |
| 范围 | 仅 P0 契约。P1+（赛事/班级/运营数据）契约后续补 RFC-014b。 |
| 红线 | 所有 DTO 类型入 `@fwx/shared`；可拼装零件类型用 `@fwx/parts-schema`；**禁止 web/api 重复定义**。 |

> **〔为什么有这份附录〕** Codex 两轮评审后判定：RFC-014 作为架构框架已就绪，但"直接交给前端开发"还缺 API/DTO/RBAC/Part 持久化的字段级定义。本附录补齐，使前端可照此实现、前后端不分叉。

---

## 1. API 通用约定

### 1.1 响应信封（envelope）

沿用现有 `{ success, data/error }` 风格（见 `apps/web/src/pages/Admin/AdminPage.tsx` 的 `result.success/data/error`），**统一 error 为结构化对象**（现有为 string，需统一）：

```ts
// 入 @fwx/shared
type ApiOk<T>  = { success: true;  data: T }
type ApiErr    = { success: false; error: { code: ApiErrorCode; message: string } }
type ApiResponse<T> = ApiOk<T> | ApiErr

type ApiErrorCode =
  | 'UNAUTHENTICATED'   // 401 无/失效 JWT
  | 'FORBIDDEN'         // 403 缺权限码
  | 'NOT_FOUND'         // 404
  | 'CONFLICT'          // 409 唯一约束/命名冲突
  | 'VALIDATION'        // 422 schema 校验失败（附 message）
  | 'INTERNAL'          // 500
```

### 1.2 分页

- 请求：`?page=1&pageSize=20`（pageSize 默认 20、上限 100）。
- 响应：`data` 为 `Paginated<T>`。
```ts
type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number }
```
> 🔴 现 `GET /users` 全量返回（`authController` ~L181），P0 必须改分页 + 建索引（`role`、`status`、`createdAt`、`username` 文本）。

### 1.3 鉴权与审计

- 所有 `/api/admin/*` 走三层：access-key（过渡）→ JWT → RBAC 权限码中间件。
- **每个写操作（POST/PATCH/DELETE）服务端落 `AuditLog`**；审计写失败 → 整个操作回滚（审计先行，RFC-014 §2.2）。

---

## 2. RBAC 权限码

### 2.1 命名规范：`资源:动作`

```
users:read   users:write   users:role   users:import
guardians:write
courses:read  courses:write  courses:publish
assets:read   assets:write
parts:read    parts:write    parts:review
kit:read      kit:write
audit:read
compliance:read   compliance:export
```

### 2.2 角色 → 权限码

| 角色 | 权限码 |
|---|---|
| super-admin | 全部 |
| operator | `users:read` `users:write` `audit:read` `parts:read` `courses:read` `kit:read` |
| content-editor | `courses:*` `assets:*` `parts:read` |
| reviewer | `parts:read` `parts:review` `audit:read` |
| teacher | 仅本班数据（服务端按 `orgId/managedClassIds` 过滤，不发全局写权限码） |

> 前端用权限码做导航隐藏 / 按钮禁用；后端用同一组码做中间件校验。**权限码常量入 `@fwx/shared`。**

---

## 3. P0 DTO（字段级，入 `@fwx/shared`）

```ts
// ── 用户（M2）──
interface AdminUserListItem {
  id: string; username: string; nickname?: string
  role: 'student' | 'teacher' | 'parent' | 'admin'   // 补齐 parent
  status: 'active' | 'disabled'
  grade?: string; school?: string
  createdAt: string; lastLogin?: string
}
interface AdminUserDetail extends AdminUserListItem {
  email?: string                                      // 列表脱敏，详情按权限返回
  teacherCert?: { status: 'none'|'pending'|'verified'; submittedAt?: string; reviewedBy?: string; reviewedAt?: string }
  orgId?: string
  guardians?: GuardianLinkDTO[]
  stats?: { projects: number; lessonsDone: number; competitions: number }
}
interface GuardianLinkDTO {
  id: string; guardianUserId: string; studentUserId: string
  status: 'pending' | 'authorized' | 'revoked'
  authorizedAt?: string; revokedAt?: string
}
interface UserImportResult {
  total: number; created: number; skipped: number
  errors: { row: number; reason: string }[]
}

// ── 课程（M3）──
interface CourseDTO {
  id: string; title: string; order: number
  status: 'draft' | 'published'; version: number
  publishedAt?: string; coverAssetId?: string
}
interface LessonDTO {
  id: string; courseId: string; title: string; order: number
  duration: number; content: string                    // Markdown
  assets: string[]                                      // AssetDTO.id[]，不内联
  refs?: { partCategory?: string; sceneId?: string; templateId?: string }
  status: 'draft' | 'published'; version: number
}
interface CourseTree extends CourseDTO { lessons: Pick<LessonDTO,'id'|'title'|'order'|'duration'|'status'>[] }

// ── 资产（M3）──
interface AssetDTO {
  id: string; kind: 'image' | 'video' | 'glb' | 'thumbnail'
  url: string; uploadedBy: string; refCount: number; createdAt: string
}

// ── 零件（M4）──
interface PartAdminItem {                               // 可拼装零件（对齐 @fwx/parts-schema 的 Part + 后台元）
  partNumber: string                                   // FW-[A-Z]+-\d{3}
  category: string                                     // PartCategoryEnum
  nameZh: string; nameEn: string
  glbPath: string; thumbnailPath: string
  snapPointCount: number; layer?: 'single' | 'double'
  source: 'official' | 'ugc'                           // 〔补〕
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected'  // 〔补〕
  version: number                                      // 〔补〕
  deprecated: boolean
  bomItemIds: string[]                                 // 关联 KitItem
}
interface KitItemDTO {                                  // 采购 BOM（现 Part.js）
  id: string; name: string
  type: 'motor' | 'prop' | 'flightController' | 'sensor' | 'wood'
  spec: string; priceCents: number; imageUrl?: string
}

// ── 审计（M0）──
interface AuditLogDTO {
  id: string; actor: string; action: string; target: string
  at: string; diffSummary?: string
}
```

---

## 4. P0 端点清单

> 全部 `ApiResponse<…>` 包裹；列表 `…<Paginated<T>>`。

### 4.1 后台（`/api/admin/*`）

| Method · Path | 权限码 | 响应 data |
|---|---|---|
| GET `/overview` | （任意 admin） | 概览统计 |
| GET `/users?role=&q=&status=&page=&pageSize=` | `users:read` | `Paginated<AdminUserListItem>` |
| GET `/users/:id` | `users:read` | `AdminUserDetail` |
| PATCH `/users/:id` | `users:write` | `AdminUserDetail` |
| POST `/users/:id/role` | `users:role` | `AdminUserDetail` |
| POST `/users/:id/reset-password` | `users:write` | `{ resetLink?: string }` |
| POST `/teachers/:id/verify` | `users:role` | `AdminUserDetail` |
| POST `/users/import` | `users:import` | `UserImportResult` |
| POST `/guardians` | `guardians:write` | `GuardianLinkDTO` |
| GET/POST `/courses` · PATCH/DELETE `/courses/:id` | `courses:read`/`courses:write` | `CourseTree` / `CourseDTO` |
| POST `/courses/:id/publish` · `/rollback/:ver` | `courses:publish` | `CourseDTO` |
| GET/POST/PATCH/DELETE `/courses/:cid/lessons[/:lid]` | `courses:write` | `LessonDTO` |
| GET/POST `/assets` · DELETE `/assets/:id` | `assets:read`/`assets:write` | `AssetDTO` |
| GET `/parts` · POST `/parts` · PATCH `/parts/:id` | `parts:read`/`parts:write` | `Paginated<PartAdminItem>` / `PartAdminItem` |
| POST `/parts/:id/review` · `/publish` | `parts:review` | `PartAdminItem` |
| GET/POST/PATCH `/kit[/:id]` | `kit:read`/`kit:write` | `KitItemDTO` |
| GET `/audit?page=&pageSize=` | `audit:read` | `Paginated<AuditLogDTO>` |

### 4.2 公开（学生端，非 admin）— 解决 endpoint 冲突

| Method · Path | 说明 |
|---|---|
| GET `/api/courses` | 仅 `status='published'` 的 `CourseTree[]`；接前端已占位的 `getCourses()` |
| GET `/api/courses/:id` | 仅 published lessons |

> 后台读全部（含 draft），公开只读 published。前端 `utils/api.ts` 现有 `getCourses('/courses')` 占位即指向公开端点。

---

## 5. 数据模型落地决策（开工必读）

1. **旧 `Part` model 改名 `KitItem`**：现 `apps/api/src/models/Part.js`（mongoose model `'Part'`）改为 `'KitItem'`。🛑 **collection 改名涉及 Mongo 结构，需人工确认**（CLAUDE.md §3.5）——是改 collection 名（需迁移脚本）还是仅改 model 名保留旧 collection，请拍板。
2. **新增可拼装 `Part` 持久化**：字段 = `@fwx/parts-schema` 的 `PartSchema` + `{ source, reviewStatus, version, bomItemIds }`；建议 collection `buildparts`，与旧 collection 不冲突。
3. **`connectionRules` 上移**：从 `apps/web/src/utils/connectionRules.ts` 迁入 `@fwx/parts-schema`（或其依赖），**后端零件校验不得依赖 `apps/web`**。
4. **CJS 消费**：`@fwx/parts-schema` 出 dual build（ESM+CJS+d.ts），api 用 CJS 入口 `require`（RFC-014 §5.4 方案①）。

---

## 6. 开工前必须拍板（🛑 阻塞项）

1. 🛑 **排期/人力**：全量 P0 后台（A-M0~A-M3）与 RFC-011 M5 主线，**谁先 / 是否分人/分窗口**。Codex 两轮强调：不定就会多线互相阻塞。
2. 🛑 **Mongo collection**：旧 `Part`→`KitItem` 是改 collection（迁移）还是仅改 model 名。
3. ⚠️ envelope 的 `error` 由 string 升级为 `{code,message}`，需同步现有前端调用点。

> 以上 1、2 拍板后，A-M0（地基+审计）即可开工，前端可照本附录的 §3/§4 并行做页面。

---

*— RFC-014a 结束 —*
*版本 v0.1 · 2026-06-16 · RFC-014 实现契约层 · 翼创未来（芬奇答奥重庆科技有限公司）*
