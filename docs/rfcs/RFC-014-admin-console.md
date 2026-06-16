# RFC-014 · 后台管理系统（Admin Console）整体框架

| 字段 | 值 |
|---|---|
| 状态 | Draft v0.2（已过 Codex 计划评审，待人类确认进开发） |
| 作者 | 程楷迪（Corty） / 军师代笔 |
| 日期 | 2026-06-16 |
| 关系 | **是 [RFC-011 平台 2.0 架构](RFC-011-platform-2.0-architecture.md) 的 Admin 子系统规格**。把 RFC-011 散落在 A1/E2/F1/F3/F2/D4 的运营管理面，横向收拢成统一的 Admin Console。 |
| 编号说明 | 〔v0.2〕原 v0.1 误用 RFC-013，与既有 `RFC-013-design-persistence.md` 撞号，**改为 RFC-014**。 |
| 范围 | ① 后台模块划分与信息架构；② 各模块"看什么/管什么"；③ 数据模型增量与接口契约；④ 权限模型；⑤ 分期落地。 |
| **不在范围** | 具体代码实现、UI 视觉、部署迁移（属 RFC-012）。本 RFC 是"规划完整框架"，落地细节各模块开发时再出实现计划。 |

> **〔v0.2 修订摘要〕** 据 Codex 计划评审返工：① **零件改为 KitItem/Part 分层**，不再"覆盖重构"（原 v0.1 对 parts-schema 真实 schema 判断有误）；② **审计基座提前到地基期**（写操作不得先于审计）；③ 补 **CJS 后端消费 ESM parts-schema** 的方案；④ 补遗漏：学校批量导入、家长监护关系、数据合规操作、媒体资产、列表分页；⑤ P0 经产品决策**保持全量**，但显式标注与 RFC-011 M5 主线的工期权衡。

---

## 1. 背景：后台现状盘点（代码核实，2026-06-16）

当前后台 = **一个密钥门 + 一个只读用户列表**，与一个有 9 类业务实体的平台严重不匹配。

| 维度 | 现状（代码核实） | 缺口 |
|---|---|---|
| 入口 | `pages/Admin/`：`AdminGate`（输 `ADMIN_ACCESS_KEY`）→ `AdminLayout` → 单页 `AdminPage` | 无多模块导航 |
| 后端接口 | `routes/admin.js` 仅 2 个：`POST /verify-access-key`、`GET /users`；复用 `authController`，**无独立 adminController** | 课程/零件/作品/赛事/班级全无管理接口 |
| 能力 | 纯只读：4 统计卡 + 用户表 | 无搜索/分页/编辑/写操作 |
| 鉴权 | `requireAdminAccessKey` → `authenticate`(JWT) → `requireRole('admin')` | admin 不分级、无审计；`ADMIN_ACCESS_KEY` 临时方案 |
| 角色 | `User.role` enum=`[student,teacher,parent,admin]`，默认 student；**前端 AdminPage 只认 3 个，渲染漏 `parent`** | **无"设为教师"入口**（teacher=0 根因），靠 `promote-admin` 脚本改库 |
| 课程 | **前端硬编码** `data/courses.ts`（5 章 15 课）；无 Course/Lesson 模型/接口；〔v0.2〕**前端 `utils/api.ts` 已有 `Course` 接口与 `getCourses()/getCourse('/courses')` 占位，但后端无对应 route——半成品契约** | "更新课程"=改代码重部署 |
| 零件 | 〔v0.2 修正〕`Part.js` 是 **BOM 价格条目（KitItem）**：`name/type(motor\|prop\|flightController\|sensor\|wood)/spec/priceCents/imageUrl`。`@fwx/parts-schema` 的 `PartSchema` 是**另一套可拼装零件模型**：`partNumber(FW-[A-Z]+-\d{3})/category(PartCategoryEnum)/name{zh,en}/asset{glbPath,thumbnailPath}/geometry/snapPoints/compatibility/layer/tags`。**`CATEGORY_ALIASES` 仅含 HUB/ARM/PLATE/JOINT/LAND/DECO，无 `motor→MOTOR`/`prop→PROP`**——两套模型无法直接互转。 | 二者是采购视图 vs 拼装视图，需**分层 + 关联**，缺持久化与上传 |
| 其它实体 | `Project/DroneDesign/Program/Competition/Score/Submission/CommunityPost` 模型已存在 | 均无 admin 管理面 |

> **结论**：后台只做了"用户实体的 1/9，且只读"。本 RFC 补成覆盖全部实体、带写操作 + 审核 + 审计的运营控制台。

---

## 2. 目标与设计原则

### 2.1 目标（可验证）
- **G1** 覆盖全部可管实体的模块清单与 IA，散落功能两跳内可达（RFC-011 §5.3）。
- **G2** 明确学生/教师/家长/管理员在后台的"可见信息 × 可操作项"边界，并给出**教师识别/晋升**机制（解决 teacher=0）。
- **G3** 课程从前端硬编码升级为后台可编辑/发布/联动的 CMS。
- **G4** 定义**零件上传完整流程**，**对齐 `@fwx/parts-schema` 真实 schema**，且与现有 BOM(KitItem) 分层共存。
- **G5** **审计先行**的权限模型（RBAC）+ `ADMIN_ACCESS_KEY` 退役路径。

### 2.2 设计原则
1. **实体即模块**：模块边界 = 实体边界。
2. **契约复用**：不另造类型，一律复用 `@fwx/shared` / `@fwx/parts-schema`（红线）。
3. **审计先行**〔v0.2〕：任何写操作上线前，`AuditLog` 基座必须已就位。
4. **未成年人数据合规优先**：最小化展示、密码永不回显、默认脱敏、操作留痕。
5. **B 端复用 C 端内核**：教师有限后台复用同接口，按权限收窄。

---

## 3. 与 RFC-011 的映射

| 后台模块 | RFC-011 来源 |
|---|---|
| M1 概览仪表盘 | A2 工作台（admin 视角） |
| M2 用户与角色 | A1 身份与角色 |
| M3 课程管理 | F2 课程与教程 |
| M4 零件管理 | E2 零件库与零件社区 |
| M5 作品与社区 | E1 作品库 / C1 项目 |
| M6 赛事管理 | D1/D3/D4 |
| M7 班级与教学 | F1 |
| M8 学习与运营数据 | E4 / 跨层统计 |
| M9 系统与权限 | A1 + 治理 |

> 后台是各层"管理面"的聚合视图。**写操作必经各层既有契约**（零件写入必经 §5.4 的 PartSchema 校验），不得绕过。

---

## 4. 后台模块总览与信息架构

### 4.1 路由树（`/admin/*`）

```
/admin                      ← M1 概览
/admin/users                ← M2 用户列表（搜索/筛选/分页）
/admin/users/import         ←    批量导入（CSV/Excel）〔v0.2 新增〕
/admin/users/:id            ←    用户详情（信息/角色/状态/关联/家长绑定）
/admin/users/teachers       ←    教师板块（识别/晋升/认证）
/admin/courses              ← M3 课程列表（章节树）
/admin/courses/:id          ←    课程/课时编辑（草稿/发布/版本）
/admin/assets               ←    媒体资产库（图片/视频/glb/缩略图）〔v0.2 新增〕
/admin/parts                ← M4 可拼装零件列表（按 PartCategoryEnum）
/admin/parts/upload         ←    零件上传向导
/admin/parts/review         ←    UGC 零件审核队列
/admin/kit                  ←    BOM/采购套件（KitItem）〔v0.2 拆出〕
/admin/works                ← M5 作品/项目（审核/精选/下架）
/admin/community            ←    社区帖管理
/admin/competitions[...]    ← M6 赛事
/admin/classroom[...]       ← M7 班级/作业（教师有限后台）
/admin/analytics            ← M8 学习与运营数据
/admin/settings             ← M9 系统设置
/admin/settings/roles       ←    RBAC 角色矩阵
/admin/settings/audit       ←    操作审计日志
/admin/settings/compliance  ←    数据合规（导出/删除/脱敏/保留）〔v0.2 新增〕
```

### 4.2 模块优先级（〔v0.2〕P0 保持全量 — 经产品决策）

| 模块 | 优先级 | 备注 |
|---|---|---|
| M0 地基（外壳+adminController+**审计基座**+分页规范） | **P0** | 〔v0.2〕审计先行 |
| M2 用户与角色（含批量导入、家长关系、合规操作、教师晋升） | **P0** | 你点名痛点 |
| M3 课程管理（CMS 全功能：草稿/发布/**版本回滚/拖拽**/联动 + 媒体资产） | **P0** | 你点名痛点；全量 |
| M4 零件管理（KitItem/Part 分层 + 上传向导 + **UGC 审核**） | **P0** | 你点名痛点；含 UGC |
| M9 RBAC（完整） | **P0** | 全量 |
| M5 作品与社区 | P1 | |
| M6 赛事管理 | P1 | 随 RFC-011 M6 |
| M7 班级与教学 | P1（B端 P0） | 随 RFC-011 M-F |
| M8 学习与运营数据 | P1 | |

> ⚠️ **〔v0.2 工期权衡，请排期时正视〕** 全量 P0（用户+全功能课程CMS+零件含UGC+完整RBAC）工作量大，会与 **RFC-011 当前 M5 主线并行抢人**。Codex 评审建议收窄；产品决策选择保持全量。**因此排期上必须显式决定：后台 P0 与 M5 谁先谁后、是否分人力**，否则两条线都会拖慢。建议至少 **M0 地基 + 审计先做，其余 P0 模块在 M5 闭环后或并行排专人**。

---

## 5. 各模块详细规格

### 5.1 M1 概览仪表盘（P0）
- 看：分角色计数 + 课程/零件/作品/进行中赛事/今日活跃 + 待审队列（UGC零件、社区举报）。
- 接口：`GET /api/admin/overview`（聚合、缓存、幂等）。

### 5.2 M2 用户与角色管理（P0，含学生/教师板块）

**学生板块**（合规优先）：

| 可见 | 可操作 | 禁止 |
|---|---|---|
| 用户名/昵称/年级/注册/最后登录/角色/状态 | 改昵称、重置密码（**一次性重置链接或强制下次改密**，非默认临时码）、启停、分班、调角色 | 不回显明文密码；列表默认脱敏邮箱/联系方式；不跨校查看 |
| 关联：作品/学习进度/参赛（只读跳转） | 导出（脱敏 CSV） | |

**教师板块**（解决 teacher=0）：
- 识别：列 `role=teacher`。
- 晋升：P0 先做"**管理员手动设为教师**"（**必记 `reviewedBy/reviewedAt` 审计**）；"教师提交认证→审核"作为增强。
- 教师字段（User 增量）：`school`、`teacherCert{status,submittedAt,reviewedBy,reviewedAt}`、`managedClassIds[]`。

**家长板块（parent）**〔v0.2 强化〕：不止是角色——需 `GuardianLink{ guardianUserId, studentUserId, status, authorizedAt, revokedAt }`，支持子账号绑定/授权/解绑。

**批量导入**〔v0.2 新增〕：`/admin/users/import` 支持 CSV/Excel 导入学生与教师，含**去重、错误行报告、幂等重试**（学校网络不稳，CLAUDE.md §3.3）。

**数据合规操作**〔v0.2 新增〕：学生数据导出、删除/禁用、脱敏、审计保留周期；入 `/admin/settings/compliance`。

**User 模型增量**：
```
status: 'active' | 'disabled'
school?, orgId?                          // 机构隔离
teacherCert?: { status, submittedAt, reviewedBy, reviewedAt }
// GuardianLink 为独立集合（见 §7）
```

**接口**：
```
GET   /api/admin/users?role=&q=&status=&page=&pageSize=   // 〔v0.2〕强制分页
GET   /api/admin/users/:id
PATCH /api/admin/users/:id
POST  /api/admin/users/:id/role            // 调角色（含设教师），写审计
POST  /api/admin/users/:id/reset-password  // 重置链接/强制改密
POST  /api/admin/teachers/:id/verify
POST  /api/admin/users/import              // 批量导入（幂等）
POST  /api/admin/guardians                 // 家长-学生绑定
```
> 〔修复〕前端 `AdminUserResponse` 角色联合类型补 `parent`；`GET /users` 现为全量返回（`authController` :181），P0 必须改分页 + 建索引。

### 5.3 M3 课程管理（P0，全功能 CMS）

- 看：章节树（Chapter→Lesson），每课 `title/order/duration/content(md)/状态/版本`。
- 操作（**全量，含 Codex 建议砍但产品保留的**）：增删改、**拖拽排序**、Markdown 编辑、草稿→预览→发布、**版本与回滚**、联动引用（课时绑定 `PartCategoryEnum`/`sceneId`/模板，存 id 不存快照）。
- **媒体资产**〔v0.2 新增〕：课程图片/视频经 `/admin/assets` 上传管理，**Lesson 用 `assets[]` 引用，不内联进 Markdown**（Codex §10.3）；上传防覆盖既有资产。
- 模型（新增）：
```
Course { id, title, order, status:'draft'|'published', version, publishedAt, updatedBy, coverAssetId }
Lesson { id, courseId, title, order, duration, content(md), assets[], refs?{partCategory?,sceneId?,templateId?}, status, version }
```
- 接口：`GET/POST/PATCH/DELETE /api/admin/courses[/:id]`、`.../lessons[/:lid]`、`POST .../publish`、`POST .../rollback/:ver`。
- 迁移：`data/courses.ts` 5章15课作 seed 灌入；学生端 `LearnPage` 改读接口（保留前端兜底）；**接上前端已占位的 `getCourses/getCourse`**。
- 类型：`Course/Lesson/Chapter` 从前端 `types/learning` **上移 `@fwx/shared`**（红线）。

### 5.4 M4 零件管理（P0）— 〔v0.2 重写：KitItem / Part 分层〕

**关键修正**：现有 `Part.js` 与 `parts-schema` 是**两套不同模型**，不能覆盖重构，而是**分层共存 + 关联**：

| 层 | 实体 | 来源 | 管什么 |
|---|---|---|---|
| 采购层 | **KitItem**（= 现有 `Part.js`，重命名澄清） | `name/type/spec/priceCents/imageUrl` | BOM、价格、套件、飞书对账 |
| 拼装层 | **Part**（对齐 `@fwx/parts-schema` 的 `PartSchema`） | `partNumber(FW-[A-Z]+-\d{3})/category/name{zh,en}/description{zh,en}/asset{glbPath,thumbnailPath,previewPath}/geometry{boundingBox,volumeCm3,estimatedWeightG}/snapPoints/compatibility/layer/tags/deprecated` | 3D 拼装、卡扣点、兼容规则 |
| 关联 | `Part.bomItemIds[]` ↔ `KitItem` | — | 一个可拼装零件可对应多个采购件 |

- 看：可拼装 Part 按 `PartCategoryEnum`（mainboard/landing/guard/joint/MOTOR/PROP，**`packages/parts-schema` 为唯一事实来源**）分类；显示 `partNumber/缩略图/glb/卡扣点数/版本(deprecated)/来源/审核态`。
- **零件上传向导**（针对可拼装 Part）：
  1. 上传 `.glb` + 缩略图 → `public/cad`、`public/thumbnails`（红线：不删既有 glb）；
  2. 填元数据：`partNumber`(FW 命名正则校验)、`category`、`snapPoints`、`geometry`、`compatibility`；
  3. **校验**：用 `@fwx/parts-schema` 的 `PartSchema.parse()` + `connectionRules` 卡扣点规则，不过阻断；
  4. 审核 → 入库 → 版本化（`deprecated` 标记旧版，不物理删）。
- **UGC 零件**（保留，P0 全量）：社区贡献 → `/admin/parts/review` 审核队列 → 同 `PartSchema` 校验 → 入库（RFC-011 §6.7）。
- **后端如何消费 ESM parts-schema**〔v0.2 新增，Codex blocker〕：`apps/api` 是 CommonJS，`@fwx/parts-schema` 是 ESM。方案三选一，**推荐①**：
  1. **给 `parts-schema` 配 dual build（ESM+CJS+d.ts，如 tsup）**，`exports` 双入口 → api 可 `require`（改动小、长期干净）；
  2. api 用 `await import()` 动态加载（需把校验处改 async）；
  3. 抽一个纯校验逻辑的 CJS 兼容子包。
  > 决策前不得假设 api 能直接 import；这是 P0 零件校验能否落地的前置。
- 接口：`GET /api/admin/parts?category=&source=&status=&page=`、`POST /api/admin/parts`（PartSchema 校验）、`PATCH /:id`、`POST /:id/review`、`POST /:id/publish`；KitItem 走 `/api/admin/kit/*`。
- 模型动作〔v0.2〕：**KitItem 保留不动（不丢 BOM 价格）**；**新增可拼装 Part 持久化**（对齐 PartSchema）；二者经 `bomItemIds` 关联。改 Mongo 集合结构前需人工确认（CLAUDE.md §3.5）。

### 5.5 M5 作品与社区管理（P1）
- 看/操作：作品列表（作者/可见性/点赞/举报）、精选(替代首页 `data/featuredWorks.ts` 硬编码)、下架/删除/处理举报；社区帖管理。
- 接口：`/api/admin/works/*`、`/api/admin/community/*`。

### 5.6 M6 赛事管理（P1，随 RFC-011 M6）
- 建赛、绑赛季/赛道(Scene)、报名、**评分复核（只读 RunResult+rubric，不改评分逻辑——RFC-011 评分红线）**、排行发布。

### 5.7 M7 班级与教学（P1，B端P0）
- 班级名册、**作业=项目模板+Scene/rubric**（复用竞赛契约 RFC-011 §6.6）、提交汇总。
- 教师有限后台：按 `orgId/managedClassIds` 服务端强制收窄，越权 403。

### 5.8 M8 学习与运营数据（P1，含"调整学习人数"）
- 真实统计（按记录聚合，不可手改）vs **展示数字**（首页营销数，`SiteConfig` 可配）——你说的"调整学习人数"是后者。
- 〔v0.2 采纳 Codex〕**展示数字默认不做**；确需做则白名单仅限营销页字段，且标注"展示值≠真实统计"。
- 模型：`SiteConfig{key,value}`。接口：`GET /api/admin/analytics`、`GET/PUT /api/admin/site-config/:key`。

### 5.9 M9 系统与权限（P0 的 RBAC + 审计；其余 P1）
- **审计基座（P0，地基期）**〔v0.2 提前〕：`AuditLog{actor,action,target,before,after,at}`，所有写操作落审计；`/admin/settings/audit` 可查。**先于任何写操作上线**。
- **完整 RBAC（P0，全量）**：`admin` 细分 `super-admin/operator/content-editor/reviewer`（见 §6）。
- `ADMIN_ACCESS_KEY` 退役：RBAC 稳定后降级为可选二次门再移除；**审计不随之推迟**。
- 机构管理（F3，P1）：`Org`、按教师/校授权。
- 合规中心〔v0.2〕：`/admin/settings/compliance`（导出/删除/脱敏/保留周期）。

---

## 6. 权限模型（RBAC，全量 P0）

| 角色 | 用户 | 课程 | 零件 | 作品/社区 | 赛事 | 班级 | 系统/审计 |
|---|---|---|---|---|---|---|---|
| super-admin | 全 | 全 | 全 | 全 | 全 | 全 | 全 |
| operator | 查看/状态 | 查看 | 查看 | 精选/下架 | 建赛/发布 | 查看 | 查看审计 |
| content-editor | — | 增删改发布 | 查看 | — | — | — | — |
| reviewer | — | — | 审核零件 | 审核举报 | 评分复核 | — | — |
| teacher | 仅本班 | 查看 | 查看 | 仅本班 | — | 本班作业/名册 | — |

> 教师复用同接口，服务端按 `orgId/managedClassIds` 收窄；越权 403。

---

## 7. 数据模型增量汇总（〔v0.2 修正〕）

| 模型 | 动作 | 关键字段 |
|---|---|---|
| `User` | 扩展 | `status, school, orgId, teacherCert` |
| `GuardianLink` | **新增** | `guardianUserId, studentUserId, status, authorizedAt, revokedAt` |
| `Course` | 新增 | `title, order, status, version, publishedAt, updatedBy, coverAssetId` |
| `Lesson` | 新增 | `courseId, content(md), order, duration, assets[], refs` |
| `KitItem` | **保留**（现 `Part.js`，澄清命名，不丢 BOM） | `name, type, spec, priceCents, imageUrl` |
| `Part`（可拼装） | **新增持久化，对齐 parts-schema** | `partNumber, category, name{zh,en}, asset, geometry, snapPoints, compatibility, layer, tags, deprecated, bomItemIds[]` |
| `Asset` | **新增** | `kind, url, uploadedBy, refCount`（媒体资产） |
| `SiteConfig` | 新增 | `key, value` |
| `AuditLog` | 新增（**地基期**） | `actor, action, target, before, after, at` |
| `Org` | 新增（P1） | `name, type, license` |

> 🔴 红线：`Course/Lesson` 类型入 `@fwx/shared`，可拼装 `Part` 用 `@fwx/parts-schema`，禁止 web/api 重复定义；改 Mongo 索引/集合结构前人工确认。

---

## 8. 接入契约与工程约定

- 接口前缀统一 `/api/admin/*`；新增独立 `adminController`（或 `controllers/admin/*`），停止往 `authController` 堆。
- **CJS↔ESM**〔v0.2〕：parts-schema 走 §5.4 的 dual build 方案，api 方能消费校验。
- **审计先行**：写操作上线前 `AuditLog` 必须就位；所有 PATCH/POST 幂等。
- **分页强制**〔v0.2〕：所有列表接口默认分页 + 合理上限 + 查询索引。
- 三态 UI（加载/空/错误）每页必备；密钥走 `.env`。

---

## 9. 分期落地（〔v0.2〕审计先行 + 全量 P0 + 工期权衡）

- [ ] **A-M0 地基（P0）**：`/admin` 多模块外壳 + 独立 `adminController` + **`AuditLog` 基座** + 分页规范 + `GET /overview`。🛑
- [ ] **A-M1 用户与角色（P0，全量）**：M2 全量 + **完整 RBAC** + 批量导入 + 家长关系 + 合规操作 + 教师晋升。🛑
- [ ] **A-M2 课程 CMS（P0，全量）**：M3 全功能（版本回滚/拖拽/联动）+ 媒体资产 + seed 迁移 + 接前端占位接口。🛑
- [ ] **A-M3 零件管理（P0，全量）**：先定 CJS↔ESM 方案 → KitItem/Part 分层 + 上传向导 + PartSchema 校验 + **UGC 审核**。🛑
- [ ] **A-M4 作品/社区/运营数据（P1）**：M5 + M8。🛑
- [ ] **A-M5 机构/合规中心/密钥退役（P1）**：M9 剩余。🛑
- [ ] **A-M6 班级/教师有限后台（P1，B端）**：M7，配 RFC-011 M-F。🛑
- [ ] **A-M7 赛事 Admin（P1）**：M6。

> ⚠️ **工期权衡（产品已选全量 P0）**：A-M1~A-M3 全量 ≈ 一个并行大平台，会与 RFC-011 M5 抢人。**排期必须显式决定后台 P0 与 M5 的先后/分工**。最低限度先做 **A-M0（含审计）**，它是其余一切写操作的前置且工作量小。

---

## 10. 开放问题与倾向建议（〔v0.2〕采纳 Codex）

1. **教师晋升**：先"管理员手动设为教师"，**但必记 reviewedBy/reviewedAt 审计**。✅倾向
2. **学生隐私**：**从严**——教师只看本班，管理员列表默认脱敏邮箱/联系方式，详情按权限展开。✅倾向
3. **课程存储**：先 Markdown 字符串，但 **Lesson 加 `assets[]` 引用，图片/视频不内联**。✅倾向
4. **`ADMIN_ACCESS_KEY`**：RBAC 稳定后再移除作二次门；**审计不推迟**。✅倾向
5. **零件历史数据**：**不一次性覆盖迁移**——KitItem 与 Part 并存，显式 `bomItemIds` 映射，人工确认后再关联。✅倾向
6. **展示数字**：**默认不做**；确需做仅营销页白名单字段并标注"展示值"。✅倾向
7. **〔新增待决〕全量 P0 的人力**：后台 P0 与 RFC-011 M5 主线如何分工/排序？需人类拍板。

---

*— RFC-014 结束 —*
*版本 v0.2 · 2026-06-16 · 据 Codex 计划评审返工 · 翼创未来（芬奇答奥重庆科技有限公司）· 锚定 RFC-011*
