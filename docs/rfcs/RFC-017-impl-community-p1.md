# RFC-017 实现子 RFC · 社区 P1（Pinterest 级完整）

> 模块工程师 · 社区（1 号）。父 RFC：RFC-017。地基契约：RFC-016（`@fwx/shared`，7 号已冻结落主干，本分支已 rebase 其上）。
> 流程：本 RFC → **Codex 计划评审（已过，见 §9 采纳记录）** → 编排者预接线共用文件 → 5 路子代理并行建叶子文件 → 集成 → 5-DoD → push 交 5 号。

## 1. 目标

P0（发布→列表→详情→点赞）之上补齐 RFC-017 全部 P1：①瀑布流浏览+热门榜 ②评论+举报 ③收藏到合集 ④关注+作者页 ⑤开源复用闭环。

## 2. 契约映射（一律消费 `@fwx/shared`，禁止自造跨端类型；后端纯 JS 但字段形状逐字对齐）

| 契约 | 流 | 易错点（Codex 提示） |
|---|---|---|
| `TrendingQuery`/`TrendingResult=Paginated<CommunityPostListItem>`/`CommunityPostListItem` | A | 列表用通用 `Paginated<T>`，不照抄 P0 自定义 `CommunityListResult` |
| `Comment`(`moderation: ModerationStatus` 是**字符串枚举非对象**)/`Report`/`ModerationStatus` | B | `Comment.authorId`；`targetType:'communityPost'` 非 `'post'` |
| `Collection`/`CollectionItem`(`addedAt` 非 `createdAt`)/`Reaction`(type=`favorite`) | C | |
| `Follow`(`followeeId` 非 `followingId`) | D | 作者 DTO 严禁回 `grade/studentId/email` |
| 既有 `CommunityPost.forkFromId`（models.ts:197）+ `Project.reusable`（models.ts:91） | E | **不用** `ForkProvenance`（见 §6 决策） |

- **谁都不许编辑 `packages/shared/`**（只读）。要改契约 → 停下问军师。

## 3. 文件归属分区（铁律：两个子代理不碰同一文件）

**编排者（我）独占的共用/有状态文件**（Codex #2：这些隐藏耦合必须收归一人）：
- 后端：`server.js`（注册路由）、`models/Project.js`（加 `reusable` 字段符合冻结契约）、`routes/community.js`（`/posts` DTO 加 `authorId`+`favoriteCount`+`reusable` 归一化；`POST /posts` 收 `reusable`+`forkFromPostId`→写既有 `forkFromId`；`/posts/:id` 回 `reusable`）
- 前端：`App.tsx`、`Navbar.tsx`、`utils/api.ts`（只动既有 `createCommunityPost` 签名加 `reusable?`/`forkFromPostId?`）、`hooks/useCommunity.ts`（`useToggleLike` 兼容无限列表缓存）、`pages/Community/CommunityPostPage.tsx`（挂 B/C/E/D 的组件 + 作者名可点进作者页）

**各子代理独占（全新建；✎=独占编辑既有文件，仅此一人动）：**

| 流 | 后端 | 前端 |
|---|---|---|
| A | `routes/communityTrending.js` | ✎`pages/Community/CommunityPage.tsx`（重写瀑布流）、`hooks/useCommunityFeed.ts` |
| B | `models/Comment.js`、`models/Report.js`、`routes/comments.js`、`routes/reports.js` | `components/features/community/CommentSection.tsx`、`hooks/useComments.ts` |
| C | `models/Collection.js`、`models/CollectionItem.js`、`routes/collections.js` | `pages/Collections/CollectionsPage.tsx`、`pages/Collections/CollectionDetailPage.tsx`、`components/features/community/SaveToCollectionButton.tsx`、`hooks/useCollections.ts` |
| D | `models/Follow.js`、`routes/follows.js` | `pages/Author/AuthorPage.tsx`、`pages/Feed/FollowingFeedPage.tsx`、`components/features/community/FollowButton.tsx`、`hooks/useFollow.ts` |
| E | `routes/forks.js`（独立，不占 community.js）、✎`components/features/project/PublishModal.tsx`（加"允许复用"开关 + 读 URL `?forkedFrom` 透传） | `components/features/community/ReuseButton.tsx`、`hooks/useFork.ts` |

> 前端新端点 fetch 在各自 hook 里 `import { apiFetch } from '../../utils/api'` 直接调，**不往 api.ts 加**。各子代理严格按 §8 冻结清单实现 DTO/props/路由/queryKey，**不自行猜形状**。

## 4. 各流接口（最小可用，复用 P0 模式：optionalAuthenticate 公域 / authenticate 写 / Reaction 聚合 / 幂等 upsert+11000 兜底）

**A**：`GET /api/community/trending?window=day|week|all&page&pageSize`（optionalAuth）→ `Paginated<CommunityPostListItem & {author,likedByMe}>`。热度=窗口内 like Reaction 计数（all=全量）。浏览仍走 P0 `/posts`（无限滚动）。

**B**：`GET /posts/:id/comments`（optionalAuth，仅回 `approved`，分页）；`POST /posts/:id/comments`（auth）`{body}`——服务端 trim+长度≤300+拒联系方式/URL/脏词（400 友好提示）+每用户限频+重复内容拦截，默认 `approved`；`DELETE /comments/:id`（auth，作者删己评）；`POST /reports`（auth）`{targetType:'comment',targetId,reason}`，`reason∈{垃圾广告,不友善,涉及隐私,其他}`，幂等，**首条举报即置该评论 `pending` 并隐藏**（非 rejected）。举报仅限 comment（Codex #1：post 无 moderation 字段）。

**C**：保存到合集为唯一收藏语义（Codex #5：砍掉独立 quick-favorite 双状态）。`GET/POST /collections`、`PATCH/DELETE /collections/:id`、`GET /collections/:id`（public 游客可看）、`POST /collections/:id/items{postId}`、`DELETE /collections/:id/items/:postId`。底层用 `CollectionItem`；封面 `coverPostId` 空回退首项。

**D**：`POST/DELETE /users/:id/follow`（auth，幂等，禁自关注）；`GET /users/:id`（optionalAuth）→ `{id,username,avatar,followerCount,followingCount,isFollowedByMe,posts:Paginated}`（**只这些公开字段**）；`GET /feed`（auth）→ 关注者作品流（分页）。

**E**：`POST /api/community/posts/:id/fork`（auth）：校验 源post存在 ∧ `project.visibility==='public'` ∧ `project.reusable===true` ∧ `designId&&programId` 都在（缺→409）→ **Mongo 事务**内白名单克隆 DroneDesign(新,status=draft)+Program(新)+Project(新,owner=我,visibility=private,reusable=false,name=源+"（复用）")，剥离 `_id/__v/时间戳/localId` → 返回 `{projectId}`。前端 ReuseButton→`nav('/design/'+projectId+'?forkedFrom='+sourcePostId)`。血缘在**发布时**经 `forkFromPostId`→`CommunityPost.forkFromId` 落地（§6）。

## 5. 贯穿要求

- 视觉沿用线上 **sky-blue**（`sky-*`/`ink-*` + 既有 `Card/Button/Input`），不另造体系；瀑布流用 **CSS columns + 轻过渡**（Codex #5：砍 GSAP/ScrollTrigger）；无限滚动用 `IntersectionObserver`（禁 scroll 监听）。
- 三态（骨架/空引导/错误重试，照抄 P0 CommunityPage）；移动端降级；键盘可达、focus 可见、`prefers-reduced-motion`。
- 子代理只动自己分区文件，不碰 §3 共用文件，不跑 git、不起 dev server；交付前后端 `node --check` 各路由可 `require`，并把"需编排者挂载/接线的清单"写进返回。

## 6. 关键决策（Codex 评审采纳）

- **fork 血缘不改契约**：`ForkProvenance` 悬空（未挂任何实体），P1 **不使用**它；改用既有 `CommunityPost.forkFromId`——发布时前端经 URL `?forkedFrom` 把源 postId 传给 `POST /posts`，后端校验源存在后写 `forkFromId`。durable 跨刷新血缘/Project 级溯源留待军师定契约（非阻塞）。
- **fork 非 durable 幂等**：无契约字段记录"克隆自"，P1 不做后端去重，靠前端按钮 pending 禁用防双击；重复 fork=可接受 P1 取舍（已记）。
- **reusable 回填**：DTO 归一化 `reusable: project.reusable===true`（存量缺字段当 false）。
- **未成年合规**：评论拒联系方式/URL/脏词 + 限频 + 首条举报即隐藏 + 固定举报类别 + 作者可删己评 + 作者 DTO 无 PII；管理员审核台属 admin 模块（非本期，仅落库待接）。

## 7. 停止点 / 红线

- 触及 `packages/shared` 或发现契约缺字段（如真要 durable provenance）→ 停下问军师。
- 不碰编辑器核心（`pages/Design|Coding`、仿真）；fork 打开编辑器若需改 → 点名设计器工程师，不自己动。
- 不碰后台/赛事/零件模块文件；不自己合并，push 交 5 号。

## 8. 集成清单（冻结：子代理按此实现，不猜）

**响应 JSON**
- PostCard（A 卡片/列表项）：`{id,authorId,author:{id,username,avatar?},projectId,title,coverUrl?,likeCount,favoriteCount,likedByMe,createdAt}`
- Comment DTO：`{id,authorId,author:{id,username,avatar?},body,createdAt}`（只回 approved，不外露 moderation 细节）
- Collection DTO：`{id,name,description?,coverUrl?,itemCount,isPublic,createdAt}`；CollectionDetail 另加 `items: PostCard[]`
- Author DTO：`{id,username,avatar?,followerCount,followingCount,isFollowedByMe}`；其作品 `Paginated<PostCard>`
- 通用分页：`{items,total,page,pageSize}`

**前端路由（编排者加到 App.tsx）**：`/collections`、`/collections/:id`、`/u/:userId`(作者页)、`/feed`(我的关注流)

**组件 props（编排者按此挂载到 CommunityPostPage）**
- `<CommentSection postId:string />`
- `<SaveToCollectionButton postId:string />`
- `<ReuseButton postId:string projectId:string reusable:boolean />`
- `<FollowButton userId:string initialFollowed?:boolean />`

**TanStack queryKey 约定（避免缓存互撞）**：A 无限流 `['community','infinite',params]`；评论 `['community','comments',postId]`；合集 `['collections']`/`['collection',id]`；作者 `['author',userId]`；关注流 `['community','feed']`。点赞 `useToggleLike`（编排者改造为同时更新分页与无限缓存）。

## 9. 验收（5-DoD，全绿才交付）

1. 真库跑通、无 mock：发布→瀑布流浏览→点赞→评论→举报→收藏进合集→关注作者→看关注流→复用改图，逐条能点。
2. `pnpm --filter web lint && pnpm --filter web typecheck` 全绿；后端各 route `require` smoke 通过。
3. 后端真连 Atlas 起来。
4. 给负责人点击路径（见 §9 点击路径）。
5. 列出动过的共享文件。

**点击路径**：登录 → /community 瀑布流、切热门(日/周/总)、下滑加载 → 进详情写评论/举报评论 → "收藏"建合集并归入 → 点作者名进作者页"关注" → 顶部"我的关注"看流 → 在"可复用"作品点"复用这个设计"→ 跳编辑器见克隆新作品。
