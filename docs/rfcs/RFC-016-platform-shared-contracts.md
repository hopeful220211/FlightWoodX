# RFC-016 · 平台共享契约基线（社区 / 赛事 / 零件库 三板块开工前置）

| 字段 | 值 |
|---|---|
| 状态 | Draft（地基，军师拥有，先于三板块落实） |
| 作者 | 程楷迪（Corty） / 军师代笔 |
| 日期 | 2026-06-16 |
| 关系 | **是 [RFC-017 社区](RFC-017-community.md) / [RFC-018 赛事](RFC-018-competitions.md) / [RFC-019 零件库](RFC-019-parts-library.md) 三份板块 RFC 的共同地基**。据 Codex 规划评审，三块高度共享，必须先统一契约再分头开发。 |
| 范围 | **只定跨块共享的数据契约、状态机、通用 UI 契约、防分叉护栏。** 不含任何板块的具体功能（那在各板块 RFC）。 |
| 红线 | 本文定义的所有类型**只进 `@fwx/shared` / `@fwx/parts-schema`**，板块内（web/api）禁止重定义。 |

> **为什么先有这份**：社区/赛事/零件库三块共享"作品数据、社交原语、分享回放、UGC 审核、通用列表"。若三人各写各的，必然撞成"名词同、语义不同"的烂摊子（如 `Part` 后端是采购件 vs parts-schema 是拼装件；`likes` 计数 vs 用户级 reaction）。**本文是三人开工前的共同宪法。**

---

## 1. 实体关系图（所有板块共用，`Project` 是中心）

```
            ┌─────────────┐
            │   Project   │  ← 创作三联产物聚合（design + program），可见性 public/private
            └──────┬──────┘
       publish     │      submit          fork(+provenance)
   ┌───────────────┼───────────────┐         └──────► newProject
   ▼               ▼               ▼
CommunityPost   Submission      （回放/分享 ShareTarget）
（社区作品）     （赛事提交）
```

- **`CommunityPost` 和 `Submission` 都只"引用" `Project`，不复制其内容。**
- 发布到社区、提交参赛、fork，都是对 `Project` 的动作，不是各板块私有逻辑。

---

## 2. 共享契约清单（入 `@fwx/shared`，TS 接口）

### 2.1 分页 / 搜索 / 排序（三块列表页统一）
```ts
interface PageRequest { page: number; pageSize: number; q?: string; sort?: string; filter?: Record<string,string> }
interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number }
```

### 2.2 社交原语（不要再往 `CommunityPost.likes` 塞计数）
```ts
type SocialTarget = 'project' | 'communityPost' | 'part' | 'comment'
interface Reaction { id: string; targetType: SocialTarget; targetId: string; userId: string; type: 'like'|'favorite'; createdAt: string }
interface Comment  { id: string; targetType: SocialTarget; targetId: string; authorId: string; body: string; moderation: Moderation; createdAt: string }
interface Follow   { id: string; followerId: string; followeeId: string; createdAt: string }
interface Report   { id: string; targetType: SocialTarget; targetId: string; reporterId: string; reason: string; createdAt: string }
```

### 2.3 Project 发布关系（社区/赛事/fork 共用）
```ts
publish(projectId): CommunityPost        // 仅 visibility=public 的 Project 可发布
submit(projectId, competitionId): Submission
fork(projectId): { project: Project; provenance: { fromProjectId: string; fromAuthorId: string } }
```

### 2.4 分享 / 嵌入 / 回放（C3，社区与赛事都用）
```ts
type ShareTarget = { kind: 'project'; id: string } | { kind: 'run'; id: string }
type EmbedMode = 'readonly-project' | 'editable-editor' | 'replay-only'
interface Share { shareId: string; target: ShareTarget; embedMode: EmbedMode; createdAt: string }  // /s/:shareId 免登录可达
```

### 2.5 Scene / Rubric / RunResultExt（赛事依赖，**占位，随 RFC-015 落地**）
```ts
// 现 commandProtocol.ts 的 RunResult 仅 {success,score?,events[]}，不足以支撑回放/评分/复核
interface RunResultExt { success: boolean; telemetry: unknown[]; physics?: object; issues?: string[] }  // 详见 RFC-015
interface ScoringRubric { dimensions: Record<string, number>; /* 声明式，赛事 D3 */ }
// Scene 完整形态见 RFC-011 §6.2；赛事 P0 先用 sceneId 引用占位
```

### 2.6 Submission / Score 状态机（杜绝"提交即有分"）
```ts
type SubmissionStatus = 'submitted' | 'running' | 'scored' | 'reviewed' | 'published' | 'rejected'
interface Submission { id: string; competitionId: string; userId: string; projectId: string; status: SubmissionStatus; runId?: string; submittedAt: string }
interface Score { id: string; submissionId: string; dimensions: Record<string,number>; total: number; source: 'auto'|'human'; createdAt: string }
```

### 2.7 零件分层（杜绝 Part 同名异义）
```ts
// 拼装零件事实来源 = @fwx/parts-schema 的 Part（partNumber/category/asset/snapPoints/...）
// 现后端 Mongo 'Part' 实为采购 BOM → 语义归为 KitItem；零件库页面消费 parts-schema，不消费 Mongo Part
// 分类码唯一来源 = PartCategoryEnum（mainboard/landing/guard/joint/MOTOR/PROP）+ CATEGORY_ALIASES
```

### 2.8 UGC + 审核模式（社区作品 / 零件 UGC / 未来 Scene UGC 统一，衔接 RFC-014 后台）
```ts
interface Moderation { status: 'draft'|'pending'|'approved'|'rejected'; source: 'official'|'ugc'; reviewedBy?: string; reviewedAt?: string }
```

### 2.9 成长事件（E4，复用现有 `growth.ts`）
```ts
// 现有：lesson_completed | project_was_forked | competition_ranked
// 补充（待定计分）：project_published | run_shared | part_accepted
```

### 2.10 资产 / 媒体（封面/GLB/缩略图/回放 JSON 只存 URL+metadata）
```ts
interface AssetRef { id: string; kind: 'image'|'video'|'glb'|'thumbnail'|'replay'; url: string; uploadedBy?: string; createdAt: string }
```

### 2.11 通用列表 UI 契约（三块复用，样式沿线上 sky-blue）
```ts
// 统一组件：<DataGrid>、<EntityCard>、<SearchBar>、<Pagination>、<FilterBar>
// 统一三态：loading（骨架屏）/ empty / error；所有列表必须分页
```

---

## 3. 落实顺序

1. **军师（我）先出"0 号契约骨架 PR"**：把 §2 的类型落进 `@fwx/shared`（占位实现即可）。
2. **3 号可立即并行**：零件分类/缩略图是独立紧急 bug，且补 `parts-schema`，不被契约阻塞。
3. **1 号 / 2 号在契约 PR 合并后接 API**：否则会把 like/comment/fork/submission 写成板块私有逻辑。

---

## 4. 防分叉护栏（三份板块 RFC 都引用本节）

1. 跨块类型**只进** `@fwx/shared` / `@fwx/parts-schema`，web/api 禁止本地重定义。
2. 三块共用**同一张实体关系图**（§1）：`Project` 中心，`CommunityPost`/`Submission` 引用它。
3. 每个 P0 PR **必须包含"删除或隔离 mock"** 的说明（社区 samplePosts / Gallery featuredWorks / 赛事 demo）。
4. **API 路径统一**：`/api/community/*`、`/api/competitions/*`、`/api/parts/*`；除 publish/fork 这类 Project 动作外，不混进 `/projects`。
5. 列表页统一**三态 + 分页**。
6. 谁要新增字段：**先改 shared 契约，再改模块**；每周同步只看契约 diff。
7. **视觉不另造**：沿线上 sky-blue 组件系统 + fwx-motion 动效；优化重点是功能、信息架构、数据契约。

---

## 5. 与三份板块 RFC 的关系

| 板块 RFC | 消费本文哪些契约 |
|---|---|
| RFC-017 社区（1号） | 2.1 分页 · 2.2 社交原语 · 2.3 发布/fork · 2.4 分享回放 · 2.8 审核 · 2.9 成长 · 2.10 资产 · 2.11 列表 UI |
| RFC-018 赛事（2号） | 2.1 · 2.3 提交 · 2.4 回放 · 2.5 Scene/RunResult · 2.6 提交/评分状态机 · 2.11 |
| RFC-019 零件库（3号） | 2.1 · 2.2（零件点赞/收藏）· 2.7 零件分层 · 2.8 UGC 审核 · 2.10 资产 · 2.11 |

> 三份板块 RFC **不重新定义**上述任何契约，只声明"消费哪些 + 板块特有逻辑"。

---

*— RFC-016 结束 —*
*版本 v0.1 · 2026-06-16 · 三板块共享地基 · 翼创未来 · 锚定 RFC-011 + Codex 规划评审*
