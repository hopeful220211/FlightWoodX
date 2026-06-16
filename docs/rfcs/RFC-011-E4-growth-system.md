# RFC-011-E4 · 成长体系（Growth System）

| 字段 | 值 |
|---|---|
| 状态 | Draft（Codex 计划关：有条件通过 → 已按意见修订） |
| 作者 | 前端设计师 3 号（工程师 C） |
| 日期 | 2026-06-16 |
| 父 RFC | [RFC-011-platform-2.0-architecture.md](RFC-011-platform-2.0-architecture.md) §4-E4(L142) / §7 创新④(L302) / §9 M6.5(L340) |
| 分支 | `feat/growth-system-e4`（从 `feat/platform-2.0` 切出，独立 PR） |
| 优先级 | P1（留存引擎） |
| 关联 | 与工程师 B 的 [RFC-011-M5.5（share）](RFC-011-M5.5-share-embed-replay.md) 无交集；fork 事件源由其 C3 provenance 提供（后续接入） |

---

## 1. 背景与目标

父 RFC §7④ 把「学徒 → 设计师 → 首席设计师」定位为 **2.0 留存引擎**：从口号做成一等系统（徽章/层级/解锁），**消费各模块事件**（完成关卡 / 作品被 fork / 参赛名次）。§4-E4 边界：**成长是横切的「积分/身份」服务**，只消费事件、不持有他人领域逻辑。

**本期目标（M6.5 雏形）**：事件源（A/B/D/E）尚未发事件 → 先把**契约 + 摄入逻辑钉死、页面对 stub 渲染**，留好接缝。**零硬依赖**。

**问题陈述**：让 12 岁用户打开 `/me/growth` 一眼看懂「我是什么身份、离下一级差多少、我赚到哪些徽章」；并让后续模块**只发一个 `GrowthEvent` 即可驱动成长**，无需理解积分规则。

---

## 2. 范围

**只动（逻辑路径 → 真实落点）：**
- `shared/growth.ts` → `packages/shared/src/growth.ts`（新建）+ `index.ts` 加一行导出
- 事件摄入 store → `apps/web/src/stores/growthStore.ts`（新建，zustand）
- `features/growth/**` → `apps/web/src/pages/Me/Growth/`（页面 + 子组件 + stub API + fixture）
- `/me/growth` 路由 → `apps/web/src/App.tsx`（加 1 条）
- 主导航 → `apps/web/src/components/layout/Navbar.tsx`（`authedItems` **追加 1 个**入口）

**禁止触碰**：`commandProtocol*`（IR 红线）、`pages/Projects`（features/project）、share 相关（features/share，工程师 B）、`MePage.tsx`、他人 WIP。

---

## 3. 方案设计

### 3.1 契约层 `packages/shared/src/growth.ts`（纯 TS，无副作用，跟随 `models.ts` 风格）

```ts
import type { IsoDateString } from './models';

// ---- 层级（升序）----
export type GrowthTierId = 'apprentice' | 'designer' | 'chief_designer';
export interface GrowthTier { id: GrowthTierId; name: string; minPoints: number; blurb: string; }
export const GROWTH_TIERS: readonly GrowthTier[]; // apprentice=0 / designer=300 / chief_designer=1000

// ---- 成长事件（消费各模块语义事件；事件源不需懂积分规则）----
export type GrowthEventType = 'lesson_completed' | 'project_was_forked' | 'competition_ranked';
interface BaseGrowthEvent { id: string; userId: string; occurredAt: IsoDateString; }
export interface LessonCompletedEvent   extends BaseGrowthEvent { type: 'lesson_completed';   lessonId: string; }
export interface ProjectWasForkedEvent  extends BaseGrowthEvent { type: 'project_was_forked'; projectId: string; forkedByUserId: string; } // 我的作品被他人 fork
export interface CompetitionRankedEvent extends BaseGrowthEvent { type: 'competition_ranked'; competitionId: string; rank: number; }
export type GrowthEvent = LessonCompletedEvent | ProjectWasForkedEvent | CompetitionRankedEvent;

// ---- 积分规则（集中 shared）----
export function pointsForEvent(e: GrowthEvent): number;
//  lesson_completed = 20
//  project_was_forked = (forkedByUserId === userId ? 0 : 50)   // 防自刷
//  competition_ranked = rank 非正整数 ? 0 : rank===1?200 : rank<=3?120 : rank<=10?60 : 40（参与基础分）

// ---- 度量（聚合中间量，徽章判定输入）----
export interface GrowthMetrics { totalPoints: number; lessons: number; forks: number; competitions: number; bestRank: number | null; }

// ---- 徽章（声明式：isUnlocked 只在 shared 内被 ingest 调用，页面只读 unlockedBadgeIds）----
export type BadgeId =
  | 'first_flight' | 'diligent_learner' | 'inspiration_source'
  | 'arena_rookie' | 'certified_designer' | 'chief_designer';
export interface BadgeDef { id: BadgeId; name: string; description: string; unlockHint: string; isUnlocked: (m: GrowthMetrics) => boolean; }
export const BADGE_DEFS: readonly BadgeDef[];
//  first_flight: lessons>=1 / diligent_learner: lessons>=5 / inspiration_source: forks>=1
//  arena_rookie: competitions>=1 / certified_designer: totalPoints>=300 / chief_designer: totalPoints>=1000

// ---- 成长状态（页面消费）----
export interface GrowthState {
  totalPoints: number;
  currentTier: GrowthTier;
  nextTier: GrowthTier | null;          // 封顶 = null
  pointsIntoCurrentTier: number;
  pointsToNextTier: number | null;      // 封顶 = null
  progressPercent: number;              // 0-100（clamp），封顶 = 100
  metrics: GrowthMetrics;
  unlockedBadgeIds: BadgeId[];
  recentEvents: GrowthEvent[];          // 去重后按 occurredAt 倒序（同时刻按 id 稳定）
}

// ---- 摄入核心（纯函数；接缝点）----
//  规则：① 按 event.id 幂等去重（重复上报不重复计分）；② 计分用 pointsForEvent；
//        ③ recentEvents 按 occurredAt desc、同时刻 id desc；④ 空输入 → apprentice/0 分。
export function ingestGrowthEvents(events: GrowthEvent[]): GrowthState;
```

**为何积分规则在 shared 聚合时算、而非事件自带**：事件源只描述"发生了什么"，**成长服务定规则**——符合 §4-E4 解耦边界，调参只改一处。
**为何 fixture 不进 shared**：避免污染前后端共享包（A3）；样例数据放前端，单测样例在 `growth.test.ts` 内联。

### 3.2 事件摄入 store `apps/web/src/stores/growthStore.ts`（zustand）

为何 zustand 而非 TanStack Query：成长是「事件流 → 聚合派生态」非 CRUD 资源，且任务点名"摄入 store"。**只 `import type` 自 `@fwx/shared`，不重复定义类型。**

```ts
import type { GrowthEvent, GrowthState } from '@fwx/shared';
type GrowthStatus = 'idle' | 'loading' | 'ready' | 'error';   // empty 不入 store，由 ready && events.length===0 推导
interface GrowthStoreState {
  status: GrowthStatus;
  error?: string;
  events: GrowthEvent[];
  derived: GrowthState | null;          // = ingestGrowthEvents(events)
  load: () => Promise<void>;            // 调 stub API → set events + derived
  ingest: (e: GrowthEvent) => void;     // 接缝：append + 重算（未来真实事件源调它）
  reset: () => void;
}
```

### 3.3 stub API 与可复现三态 `pages/Me/Growth/growthApi.ts` + `growthFixtures.ts`

- `growthFixtures.ts`：导出 `SAMPLE_GROWTH_EVENTS`（演示「设计师」档：6 课 + 2 次被 fork + 1 次 top3 ≈ 340 分）。
- `growthApi.ts → fetchGrowthEvents()`：模拟异步（~400ms）。**可复现三态用 URL query**（非手改源码）：`?growthStub=empty` 返回 `[]`、`?growthStub=error` reject、默认返回样例。
- **接缝注释**：真实接入 = 把 `fetchGrowthEvents` 指向后端 `GET /api/growth/events`。

### 3.4 页面结构 `pages/Me/Growth/GrowthPage.tsx`（四种页面状态：加载 / 空 / 错误 / 成功）

- `loading` 骨架；`error` → EmptyState + 重试；`empty`(`ready && 无事件`) → EmptyState「还没有成长记录，去完成第一课吧」+ 跳 `/learn`；`ready` 渲染内容。
- `ready` 自上而下：① `PageHeader`「成长之路」；② **当前身份卡**（Tier 名 + blurb + 总积分 + 到下一级 `ProgressBar` + 「还差 N 分成为设计师」/封顶「已达最高身份」）；③ **身份阶梯 `TierLadder`**（三段，高亮当前；移动纵向 / 桌面横向）；④ **徽章墙 `BadgeGrid`**（`BADGE_DEFS` 全量，解锁高亮、未解锁灰显+锁+`unlockHint`）；⑤ **成长足迹 `EventTimeline`**（`recentEvents` → 文案+积分）。
- 复用 `Card / PageHeader / ProgressBar / EmptyState / Badge`；徽章卡轻量自定义。子组件只抽这 3 个，不过度拆分。

### 3.5 路由与导航

- `App.tsx`：`ProtectedRoute` 内加 `<Route path="/me/growth" element={<GrowthPage />} />`。
- `Navbar.tsx`：`authedItems` 追加 `{ to: '/me/growth', label: '成长', icon: Sparkles }`（桌面 nav + 移动菜单同源渲染，自动都有）。

### 3.6 接缝（后续怎么接）

未来任一模块领域事件发生：`useGrowthStore.getState().ingest({ id, userId, type:'project_was_forked', projectId, forkedByUserId, occurredAt })`，或把 `fetchGrowthEvents` 指向真实端点。**积分/层级/徽章规则全在 `shared/growth.ts`，事件源零认知负担。**

---

## 4. 交付物清单

- [ ] `packages/shared/src/growth.ts`：契约 + `pointsForEvent` + `ingestGrowthEvents`（幂等去重+排序）+ `GROWTH_TIERS` + `BADGE_DEFS`(`isUnlocked`)
- [ ] `packages/shared/src/index.ts`：`export * from './growth'`
- [ ] `packages/shared/src/growth.test.ts`：聚合/升级阈值命中/徽章解锁/幂等去重/非法 rank/倒序/封顶 null/空输入/clamp
- [ ] `apps/web/src/stores/growthStore.ts`：zustand 摄入 store（仅 `import type`；三态 + ingest 接缝）
- [ ] `apps/web/src/pages/Me/Growth/`：`GrowthPage` + `growthApi` + `growthFixtures` + 子组件（TierLadder/BadgeGrid/EventTimeline）
- [ ] `apps/web/src/App.tsx`：`/me/growth` 路由；`Navbar.tsx`：追加「成长」入口
- [ ] 6+ 截图（ready 桌面/移动、loading、empty、error、徽章墙）+ 控制台无错误证据
- [ ] 独立 commit + PR + hash；勾选父 RFC §9 M6.5

## 5. 量化验收标准（DoD）

1. `/me/growth` 渲染**层级 + 徽章 + 进阶进度**（截图为证）。
2. `GrowthEvent` 契约 + 摄入 store 就位；`ingestGrowthEvents` 单测覆盖：升级阈值刚好命中、徽章解锁、**重复事件幂等不重复计分**、**非法 rank 计 0**、事件倒序、`pointsToNextTier` 封顶 `null`、`progressPercent` clamp 0-100、空输入。
3. **四种页面状态齐全**（加载/空/错误/成功）、**无 console 报错**、**响应式**（375px + ≥1024px 均不破版）。
4. `pnpm --filter @fwx/shared test` 全绿；`pnpm lint && pnpm typecheck` 全绿。
5. **类型只 `import type` 自 `@fwx/shared`**；规则函数（`ingestGrowthEvents`/`pointsForEvent`）与展示常量（`GROWTH_TIERS`/`BADGE_DEFS`）允许 value import（消费跨端唯一事实来源，避免在 web 重复规则）；不在 web 重复定义 `GrowthEvent` 类型。
6. 附 **6+ 截图**；独立分支 + 独立 PR + commit hash。

## 6. 测试计划

- **单测**（shared）：`ingestGrowthEvents` 各分支 + `pointsForEvent` 名次分档 + 幂等/边界（见 DoD 2）。
- **类型/lint**：`pnpm lint && pnpm typecheck`。
- **端到端目测**：浏览器 `/me/growth` 三态（用 `?growthStub=`）、375/1024 响应式、console 无错。

## 7. 停止点 🛑

编码完成 + ⑥ Codex 代码评审 + 截图齐全后，停下汇报，等人类决定是否合并。

## 8. 不在本期范围

后端 `/api/growth/events`、DB 模型、跨 tab 同步、可运营配置积分规则（均超出 M6.5 雏形）。
