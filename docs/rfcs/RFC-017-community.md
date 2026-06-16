# RFC-017 · 社区板块优化（1 号工程师）

| 字段 | 值 |
|---|---|
| 状态 | Draft（待人类确认 + 开工） |
| 负责 | 1 号工程师 |
| 关系 | 锚定 [RFC-011](RFC-011-platform-2.0-architecture.md) E1（作品库/展厅）/ E4（成长）/ C3（分享/fork）；**消费 [RFC-016 共享契约](RFC-016-platform-shared-contracts.md)，不自造**。 |
| 定位 | **社区 = 作品的社交分发层。** 把"作品即社交货币"（RFC-011 创新①，全平台最高杠杆）做成原生能力。 |

> **一句话**：让学生把 `Project` 一键发布成社区作品，能被浏览、点赞、收藏、评论、fork、分享回放——每个作品都是一个营销面，直喂小红书。

---

## 1. 现状（调研核实）
- 三处 Mock 各自为政：`CommunityPage.samplePosts`、`GalleryPage.featuredWorks`、后端模型。**无单一事实来源。**
- `CommunityPost` 模型有（`id/authorId/projectId/title/description/likes/forkFromId`），但**零路由**。
- 点赞/评论/收藏/fork/关注/排行**全未通电**（按钮只 toast 模拟）。
- `Project` 有真实 CRUD + `visibility`，但**没有"发布到社区"的入口**。
- **`Gallery` 与 `Community` 功能重复**（一个混展草稿+精选，一个只浏览社区）。

## 2. 消费的共享契约（来自 RFC-016，禁止自造）
2.1 分页/搜索 · 2.2 社交原语（`Reaction/Comment/Follow/Report`）· 2.3 发布/fork（`publish/fork+provenance`）· 2.4 分享/回放（`Share/EmbedMode`）· 2.8 审核（`Moderation`）· 2.9 成长事件 · 2.10 资产 · 2.11 通用列表 UI。

> ⚠️ **点赞不要再往 `CommunityPost.likes` 塞计数**，一律走 `Reaction`（§2.2）。

## 3. 目标与功能（对照功能导图社区点）
| 功能（功能导图） | 阶段 |
|---|---|
| 发布作品到社区（Project→CommunityPost，仅 public） | **P0** |
| 浏览作品库 / 搜索 / 分页 | **P0** |
| 作品详情（聚合 Project 信息 + 作者 + 零件清单 + fork 血缘） | **P0** |
| 点赞 / 收藏（走 Reaction） | **P0** |
| Gallery 与 Community 合并（Gallery = 社区的"精选/我的"视图） | **P0** |
| 评论 | P1 |
| 关注创作者 / 作者页 | P1 |
| 点赞排行榜 / 热门榜 | P1 |
| 灵感合集（board，Pinterest 式收藏分类） | P1 |
| 分享链接 / 嵌入 / 回放观战（C3） | P1 |
| 成长事件接入（发布/被 fork → E4） | P1 |
| 举报 / 审核入口（`Moderation`） | P1（字段第一版就带） |

## 4. P0 收口清单
1. 删除 `samplePosts` / `featuredWorks` mock，接真实 `GET /api/community/posts`（分页）。
2. `POST /api/community/posts`（或 `/projects/:id/publish`）：**仅 `visibility=public` 的 Project 可发布**。
3. 作品详情页：聚合 Project 封面/作者/零件清单/fork 血缘（"基于 @作者 的《作品》"）+ 点赞/收藏/分享入口。
4. 点赞/收藏走共享 `Reaction`，乐观更新 + React Query mutation。
5. **Gallery 合并路线定下来**：Gallery 作为社区的"我的/精选"视图，不再独立 mock。

## 5. UI / 交互（沿线上 sky-blue + fwx-motion，不另造视觉）
- 作品网格：卡片 hover **scale 1.02 + 阴影加深**（design-system §5.4），元信息字重轻、色淡。
- 筛选「全部/我的/精选」用**下划线 tab**；排序「最新/最热」用**下拉**。
- 详情页：左 3D/回放预览，右作者卡（关注按钮 P1）+ 零件清单 + fork 血缘 + 点赞/收藏/分享。
- 列表三态（骨架屏/空/错误）+ 分页。动效用 `fwx-motion` skill（卡片入场、点赞反馈）。

## 6. 板块特有 API（`/api/community/*`）
`GET /posts`（分页/搜索）· `GET /posts/:id` · `POST /posts`（发布）· `POST /posts/:id/fork` · `GET /posts/:id/comments`（P1）· `GET /trending`（P1）。社交动作走共享 Reaction/Comment 接口。

## 7. 分期 / 验收 / 停止点
- [ ] **P0**：发布通电 + 真实列表/详情 + 点赞收藏 + Gallery 合并。**验收：能把一个 public Project 发布成社区作品并被他人点赞，无 mock。** 🛑
- [ ] **P1**：评论/关注/排行/合集/分享回放/成长事件/审核。🛑

## 8. 边界提醒（防越界/分叉）
- ❌ 不重新定义 `Project` / `RunResult` / `fork` / 分享回放——用 RFC-016 契约。
- ❌ 不继续维护 Gallery 与 Community 两套作品展厅。
- ❌ 社交原语不写成社区私有逻辑（like/comment/follow 全走共享）。
- ✅ 未成年人合规：评论/作品第一版就带 `Moderation` 字段 + 举报入口。

*— RFC-017 v0.1 · 2026-06-16 · 锚定 RFC-011 + RFC-016 —*
