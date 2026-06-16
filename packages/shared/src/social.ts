/**
 * @fwx/shared · 社交 / 分享 / 审核契约（RFC-016 §2.2 / §2.4 / §2.8）
 *
 * 社区(RFC-017) / 赛事(RFC-018) / 零件库(RFC-019) 三块跨模块共用，
 * **禁止 web/api 重复定义**（RFC-016 §4 红线）。
 *
 * 复用已有、不在此重建：
 * - 分页：`api.ts` 的 `Paginated<T>` / `PaginationQuery`
 * - 资产：`admin.ts` 的 `AssetDTO`（回放 JSON 如需新 kind，去 admin.ts 扩展）
 * - 成长事件：`growth.ts` 的 `GrowthEvent`（新增 published/shared 事件为 P1，届时在 growth.ts 补）
 * - 项目聚合：`project.ts` 的 `ProjectAggregate`
 *
 * 本文件只补"社交原语 / 分享回放 / 统一审核 / fork 溯源"。纯类型，无运行时副作用（A3 红线）。
 */
import type { IsoDateString } from './models';

// ===== 通用：可被社交动作指向的目标 =====
export type SocialTarget = 'project' | 'communityPost' | 'part' | 'comment';

// ===== 审核（§2.8）：社区作品 / 零件 UGC / 未来 Scene UGC 统一 =====
// 注：admin.ts 的 `PartAdminItem.reviewStatus` / `source` 是其历史内联形式，
// 后续可收敛到本组类型；新代码一律用这里的 Moderation。
export type ModerationStatus = 'draft' | 'pending' | 'approved' | 'rejected';
export type ContentSource = 'official' | 'ugc';

export interface Moderation {
  status: ModerationStatus;
  source: ContentSource;
  reviewedBy?: string;
  reviewedAt?: IsoDateString;
}

// ===== 社交原语（§2.2）=====
// 点赞/收藏**不再**往 `CommunityPost.likes` 塞计数，一律用 Reaction（用户级、可取消、可排行）。
export type ReactionType = 'like' | 'favorite';

export interface Reaction {
  id: string;
  targetType: SocialTarget;
  targetId: string;
  userId: string;
  type: ReactionType;
  createdAt: IsoDateString;
}

export interface Comment {
  id: string;
  targetType: SocialTarget;
  targetId: string;
  authorId: string;
  body: string;
  /** 评论走审核（未成年人合规，第一版就带）。 */
  moderation: ModerationStatus;
  createdAt: IsoDateString;
}

export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: IsoDateString;
}

export interface Report {
  id: string;
  targetType: SocialTarget;
  targetId: string;
  reporterId: string;
  reason: string;
  createdAt: IsoDateString;
}

// ===== 分享 / 嵌入 / 回放（§2.4，C3）=====
// 社区作品与赛事成绩都用：一个 Project 或一次 Run 生成免登录可达的 /s/:shareId。
export type ShareTarget =
  | { kind: 'project'; id: string }
  | { kind: 'run'; id: string };

export type EmbedMode = 'readonly-project' | 'editable-editor' | 'replay-only';

export interface Share {
  shareId: string;
  target: ShareTarget;
  embedMode: EmbedMode;
  createdAt: IsoDateString;
}

// ===== fork 溯源（§2.3）=====
// fork(project) → 新 Project + provenance；社区"基于 @作者 的《作品》"血缘展示用。
export interface ForkProvenance {
  fromProjectId: string;
  fromAuthorId: string;
}
