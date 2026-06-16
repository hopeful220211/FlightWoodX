# RFC-017-impl · 社区 P0 实现子 RFC（1 号工程师）

| 字段 | 值 |
|---|---|
| 父 RFC | RFC-017 社区 · 地基 RFC-016 共享契约 |
| 工作区 | worktree `~/Projects/fwx-community`，分支 `feat/rfc-017-community`（从 `feat/platform-2.0`） |
| 状态 | 待 Codex 计划评审 |
| 范围 | RFC-017 **P0 收口清单**（§4）：发布通电 + 真实列表/详情 + 点赞收藏 + Gallery 合并 |
| 红线 | 社交原语只用 `@fwx/shared` 的 `Reaction`/`Moderation`/`ForkProvenance`（RFC-016 §4）；不重定义 Project/分享；不再维护两套展厅 |

> ⚠️ **契约前置说明**：RFC-016 的 `social.ts` 由军师编写、但当前只在 3 号检出里未提交。本分支已 verbatim 引入一份（commit `1c6e6c9`，单独标注），待军师正式契约 PR 落地 platform-2.0 后替换（内容一致 → 无缝合并）。**本分支只消费、不改契约内容。**

---

## 1. 现状（已实地摸底）
- 三处 mock 各自为政：`CommunityPage.samplePosts`、`GalleryPage`→`data/featuredWorks.ts`、后端模型。**无单一事实来源。**
- `CommunityPost` 模型有（authorId/projectId/title/description/**likes:Number**/forkFromId），但**零路由**；`likes` 是裸计数、无用户级、无法防重复/取消。
- 点赞全是 toast 模拟（Gallery）或根本没有（Community）。详情页 `CommunityPostPage` 纯占位。
- `Project` 有真实 CRUD + `visibility('private'|'public')`，但**没有"发布到社区"入口**，也没有改 visibility 的 UI。
- 前端范本齐全：`apiFetch`/`ApiResponse`（utils/api.ts）、`useProjects.ts`（useQuery+乐观更新+invalidate）、`authStore`（user/token/isGuest）。后端范本齐全：`routes/projects.js`（router.use(authenticate) + 内联逻辑）、`middleware/auth.js`（req.userId）。**无 Reaction 模型/路由。**

## 2. 目标与量化验收（对照 RFC-017 §7 P0 停止点）
| # | 目标 | 量化验收 |
|---|---|---|
| G1 | 发布通电 | 一个 `visibility=public` 的 Project 能经"发布到社区"生成 `CommunityPost`；非 public 拒绝。 |
| G2 | 真实列表 | `/community` 走 `GET /api/community/posts`（分页），**删除 samplePosts/featuredWorks mock**，三态（骨架/空/错误）+ 分页齐。 |
| G3 | 真实详情 | `/community/:id` 聚合 post + 作者 + 关联 Project（封面/设计/程序）+ fork 血缘 + 点赞/分享入口。 |
| G4 | 点赞走 Reaction | 点赞/取消走 `Reaction`（用户级、唯一索引防重复），乐观更新 + invalidate；刷新后状态正确。 |
| G5 | Gallery 合并 | Gallery 定位收敛为"我的/精选"视图，不再用独立 `featuredWorks` mock 冒充社区。 |
| G6 | 工程绿 | `pnpm typecheck && pnpm lint` 全绿；列表分页；无 console 报错。 |

## 3. 方案设计

### 3.1 后端（apps/api，新增 `/api/community/*`）
- **新模型 `models/Reaction.js`**：`{ userId, targetType:'communityPost', targetId, type:'like'|'favorite', createdAt }`，唯一索引 `(userId,targetType,targetId,type)` 防重复（对齐 shared `Reaction` 形状）。
- **新路由 `routes/community.js`**（照 projects.js 分层），注册 `app.use('/api/community', ...)`：
  | 方法 | 路径 | 鉴权 | 说明 |
  |---|---|---|---|
  | GET | `/posts` | 否（公域） | 分页列表，`?page&pageSize&sort=new|hot&q`；按 `Paginated<T>` 返回 |
  | GET | `/posts/:id` | 可选 | 聚合 post+author+project；登录则附 `likedByMe` |
  | POST | `/posts` | 是 | 发布：body `{ projectId,title,description }`；**校验 project 属本人且 visibility=public**，否则 4xx |
  | POST | `/posts/:id/like` | 是 | upsert Reaction（幂等） |
  | DELETE | `/posts/:id/like` | 是 | 删 Reaction（幂等） |
  | POST | `/posts/:id/fork` | 是 | 复制关联 Project 为新 Project + 新 post，`forkFromId`/provenance（P0 最小版，复用 shared `ForkProvenance`） |
- **likes 口径**：列表/详情的赞数一律 `Reaction.countDocuments`（不信任 `CommunityPost.likes` 裸计数；该字段后续弃用/作缓存，不在本轮删 schema 字段以免动别人数据）。
- **鉴权**：列表/详情 GET 走"可选鉴权"（带 token 则解析 userId 给 likedByMe，不带也能看）；写操作必鉴权。
- **幂等性**（CLAUDE.md §3.3）：like/unlike 幂等;发布同一 project 可重复点击不产生重复 post（按 projectId+authorId 去重或允许多次？P0 先**允许重复发布**但前端发布后跳转，避免误点；去重列入 P1）。

### 3.2 前端（apps/web）
- **`utils/api.ts` 增**：`getCommunityPosts(query)`、`getCommunityPost(id)`、`createCommunityPost({projectId,title,description})`、`likeCommunityPost(id)`/`unlikeCommunityPost(id)`、`forkCommunityPost(id)`。返回沿 `ApiResponse` 拆包风格。
- **`hooks/useCommunity.ts` 新**（照 useProjects）：`useCommunityPosts(query)`、`useCommunityPost(id)`、`useLikePost()`（乐观：立即翻 `likedByMe` + `likes±1`，失败回滚，onSettled invalidate）。queryKey：`['community','posts',query]` / `['community','post',id]`。
- **`CommunityPage.tsx` 改**：删 samplePosts → `useCommunityPosts`；卡片用统一三态 + 分页；点赞按钮接 `useLikePost`（登录态可点，游客提示登录）。卡片 hover `scale 1.02+阴影`（design-system §5.4），fwx-motion 入场。
- **`CommunityPostPage.tsx` 改**：`useCommunityPost(id)` 聚合渲染——左 3D/封面预览（复用 `DesignPreview3D`/封面），右作者卡 + 关联项目（设计/程序）+ fork 血缘"基于 @作者 的《作品》" + 点赞/分享。三态。
- **发布入口**：`ProjectDetailPage` 加"发布到社区"按钮 → `PublishModal`（标题/描述 + 确认）→ `createCommunityPost`；若 project 非 public，先提示去公开（P0 用方案 B：发布弹窗内提示并允许一键设为 public，调 updateProject visibility）。
- **Gallery 合并（G5）**：本轮**最小动作**——Gallery"精选"标签不再读 `featuredWorks` mock；改为读社区热门（或暂时隐藏"精选"页签、保留"我的"），`featuredWorks.ts` 标记弃用。彻底合并方案在 §3.3 决策后定。

### 3.3 待 Codex/负责人确认的取舍
1. Gallery 与 Community 合并的彻底程度：本轮做到"去 mock + 精选指向社区热门"是否够，还是要直接把 Gallery 改成 Community 的"我的/精选"视图？
2. 发布去重：P0 允许重复发布 vs 一个 project 只允许一个 post。
3. fork 是否纳入 P0(RFC-017 §3 把 fork 列在 P0 表"作品详情"块,但 §4 收口清单未点名)——建议 fork 入 P1，P0 只做发布/列表/详情/点赞/Gallery。

## 4. 交付物清单
- [ ] 后端：`models/Reaction.js` + `routes/community.js`(发布/列表/详情/like/unlike) + server.js 注册
- [ ] 前端：api.ts 函数 + `hooks/useCommunity.ts` + CommunityPage(去mock+三态+分页+点赞) + CommunityPostPage(聚合) + 发布入口 PublishModal
- [ ] Gallery 去 `featuredWorks` mock（G5 最小版）
- [ ] `pnpm typecheck && pnpm lint` 全绿；截图（列表/详情/发布/点赞/移动端）
- [ ] 每个 P0 PR 含"删除/隔离 mock 的说明"（RFC-016 §4.3）

## 5. 测试计划
- 后端：发布(public 通过 / private 拒绝)、列表分页、like 幂等(重复点不重复计)、unlike。
- 前端：agent-browser 走 发布→列表出现→详情→点赞→刷新状态在；三态;375px。
- 工程：typecheck/lint；不触 `@fwx/shared` 内容（只消费）。

## 6.5 Codex 计划评审采纳（2026-06-17，最终决定）
- **发布幂等去重（采纳）**：`CommunityPost` 加唯一索引 `{authorId,projectId}`，`POST /posts` 用 find-or-create，重复发布返回既有 post（200）。后端强约束,不靠前端。**P0 验收**:同一用户同一 project 连发两次只产生一条。
- **fork 出 P0 → P1（采纳）**：删除 `POST /posts/:id/fork` 交付项;详情页保留 `forkFromId` 血缘**只读展示**,不做复制写入。
- **可选鉴权（采纳）**：新增 `middleware/optionalAuthenticate`——无 Authorization 直接 next;有 token 则校验,失败 401(不静默当游客,避免过期态显示错 `likedByMe`)。社区 GET 用它,写操作用原 `authenticate`。
- **Gallery 合并（采纳本轮最小版）**：`featured` 读 `/api/community/posts?sort=hot`;`my` 保留本地/项目视角;不再混本地草稿+社区,拆成 tabs。彻底 IA 合并 → P1。
- **likes 口径（采纳，避免 N+1）**：列表用 aggregation(分页 post ids → `$match targetType/type/targetId∈ids` → `$group` 计数);`likedByMe` 一次查当前用户对这些 ids 的 Reaction。索引:唯一 `{userId,targetType,targetId,type}` + 辅助 `{targetType,targetId,type}`。`CommunityPost.likes` 裸字段保留但**不读不写**。
- **发布弹窗"公开项目并发布"（采纳+二次确认）**：按钮文案点明会改 `Project.visibility`;后端发布仍独立校验属主+public,不信前端先 patch。
- **前端不重定义契约**：`Reaction`/`Paginated` 从 `@fwx/shared` 引,页面展示 DTO 可本地组合,社交原语不复制定义。

## 6. 停止点 🛑
P0 编码 + Codex 代码评审 + 截图齐后停下汇报，等负责人验收（"能把一个 public Project 发布成社区作品并被他人点赞，无 mock"）。不自行合并。fork/评论/关注/排行/分享回放/成长事件入 P1。
