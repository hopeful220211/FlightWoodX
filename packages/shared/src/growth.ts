/**
 * @fwx/shared · 成长体系契约（前后端唯一事实来源）
 *
 * RFC-011 §4-E4 / §7 创新④ / §9 M6.5：把「学徒 → 设计师 → 首席设计师」做成一等系统。
 * 成长是横切的「积分 / 身份」服务，**消费各模块事件**（完成关卡 / 作品被 fork / 参赛名次）。
 *
 * 本文件只含纯类型、常量规则与纯函数聚合，**无任何运行时副作用**（A3 红线）。
 * 前端摄入 store 在 apps/web/src/stores/growthStore.ts；样例 fixture 在前端，不进本包。
 *
 * 详见 docs/rfcs/RFC-011-E4-growth-system.md。
 */
import type { IsoDateString } from './models';

// ===== 层级（身份阶梯，按 minPoints 升序）=====

export type GrowthTierId = 'apprentice' | 'designer' | 'chief_designer';

export interface GrowthTier {
  id: GrowthTierId;
  /** 展示名：学徒 / 设计师 / 首席设计师 */
  name: string;
  /** 进入该层级所需累计积分（apprentice = 0） */
  minPoints: number;
  /** 一句话身份描述（给孩子看） */
  blurb: string;
}

/** 身份阶梯（升序）。阈值为产品参数，调整只改这里。 */
export const GROWTH_TIERS = [
  { id: 'apprentice', name: '学徒', minPoints: 0, blurb: '刚踏入木质无人机世界的小小探索者' },
  { id: 'designer', name: '设计师', minPoints: 300, blurb: '能独立设计、让无人机真正飞起来的创作者' },
  { id: 'chief_designer', name: '首席设计师', minPoints: 1000, blurb: '作品被同伴争相借鉴的领航者' },
] as const satisfies readonly GrowthTier[];

// ===== 成长事件（消费各模块语义事件；事件源不需懂积分规则）=====

export type GrowthEventType =
  | 'lesson_completed'
  | 'project_was_forked'
  | 'competition_ranked'
  | 'project_published'
  | 'project_liked'
  | 'project_favorited'
  | 'daily_task_completed'
  | 'login_streak';

interface BaseGrowthEvent {
  /** 事件唯一 id，用于幂等去重（重复上报不重复计分）。 */
  id: string;
  /** 成长归属用户 id。 */
  userId: string;
  occurredAt: IsoDateString;
}

/** 完成一节课程。 */
export interface LessonCompletedEvent extends BaseGrowthEvent {
  type: 'lesson_completed';
  lessonId: string;
}

/** 「我的作品」被他人 fork（创作者激励；forkedByUserId === userId 视为自刷，不计分）。 */
export interface ProjectWasForkedEvent extends BaseGrowthEvent {
  type: 'project_was_forked';
  projectId: string;
  forkedByUserId: string;
}

/** 参赛获得名次（rank 从 1 起）。 */
export interface CompetitionRankedEvent extends BaseGrowthEvent {
  type: 'competition_ranked';
  competitionId: string;
  rank: number;
}

/** 发布原创作品到社区。 */
export interface ProjectPublishedEvent extends BaseGrowthEvent {
  type: 'project_published';
  projectId: string;
}

/** 作品被他人点赞（创作者激励；likedByUserId === userId 视为自刷，不计分）。 */
export interface ProjectLikedEvent extends BaseGrowthEvent {
  type: 'project_liked';
  projectId: string;
  likedByUserId: string;
}

/** 作品被他人收藏（favoritedByUserId === userId 视为自刷，不计分）。 */
export interface ProjectFavoritedEvent extends BaseGrowthEvent {
  type: 'project_favorited';
  projectId: string;
  favoritedByUserId: string;
}

/** 完成一个每日成长任务。 */
export interface DailyTaskCompletedEvent extends BaseGrowthEvent {
  type: 'daily_task_completed';
  taskId: string;
}

/** 连续登录打卡（streakDays = 当前连续天数，从 1 起）。 */
export interface LoginStreakEvent extends BaseGrowthEvent {
  type: 'login_streak';
  streakDays: number;
}

export type GrowthEvent =
  | LessonCompletedEvent
  | ProjectWasForkedEvent
  | CompetitionRankedEvent
  | ProjectPublishedEvent
  | ProjectLikedEvent
  | ProjectFavoritedEvent
  | DailyTaskCompletedEvent
  | LoginStreakEvent;

// ===== 积分规则（集中 shared，事件源零认知负担）=====

/**
 * 单事件积分。
 * - lesson_completed：20
 * - project_was_forked：50（自刷 = 0）
 * - competition_ranked：rank 非正整数 = 0；1 = 200；前 3 = 120；前 10 = 60；其余 = 40（参与基础分）
 * - project_published：40（发布原创作品）
 * - project_liked：2（自刷 = 0）
 * - project_favorited：3（自刷 = 0）
 * - daily_task_completed：10
 * - login_streak：5（每次打卡；连续里程碑奖励由任务体系另给）
 *
 * ⚠️ 社交类（liked / favorited）的**每日累计上限**在事件产生侧（后端）截断后再上报，
 * 本纯函数只给单事件基础分、不感知当日总量（A3 红线：无副作用、不依赖外部状态）。
 */
export function pointsForEvent(e: GrowthEvent): number {
  switch (e.type) {
    case 'lesson_completed':
      return 20;
    case 'project_was_forked':
      return e.forkedByUserId === e.userId ? 0 : 50;
    case 'competition_ranked': {
      if (!Number.isInteger(e.rank) || e.rank <= 0) return 0;
      if (e.rank === 1) return 200;
      if (e.rank <= 3) return 120;
      if (e.rank <= 10) return 60;
      return 40;
    }
    case 'project_published':
      return 40;
    case 'project_liked':
      return e.likedByUserId === e.userId ? 0 : 2;
    case 'project_favorited':
      return e.favoritedByUserId === e.userId ? 0 : 3;
    case 'daily_task_completed':
      return 10;
    case 'login_streak':
      return 5;
  }
}

// ===== 度量（聚合中间量，徽章解锁判定输入）=====

export interface GrowthMetrics {
  totalPoints: number;
  /** 完成课程数（去重事件后）。 */
  lessons: number;
  /** 作品被有效 fork（复用）次数（排除自刷）。 */
  forks: number;
  /** 参赛次数（去重事件后）。 */
  competitions: number;
  /** 历史最好名次（仅统计合法 rank），无则 null。 */
  bestRank: number | null;
  /** 发布原创作品数。 */
  published: number;
  /** 作品被有效点赞次数（排除自刷）。 */
  likesReceived: number;
  /** 作品被有效收藏次数（排除自刷）。 */
  favoritesReceived: number;
  /** 完成的每日任务次数。 */
  dailyTasks: number;
  /** 历史最长连续打卡天数（取 streakDays 最大值）。 */
  bestStreak: number;
}

// ===== 徽章（声明式：isUnlocked 仅在本包内被 ingest 调用，页面只读 unlockedBadgeIds）=====

export type BadgeId =
  | 'first_flight'
  | 'diligent_learner'
  | 'inspiration_source'
  | 'arena_rookie'
  | 'certified_designer'
  | 'chief_designer'
  | 'streak_week'
  | 'prolific_creator'
  | 'popular_creator';

export interface BadgeDef {
  id: BadgeId;
  name: string;
  description: string;
  /** 未解锁时展示的获取提示。 */
  unlockHint: string;
  /** 解锁判定（纯函数，输入聚合度量）。 */
  isUnlocked: (m: GrowthMetrics) => boolean;
}

/** 徽章定义表（展示顺序即此顺序）。 */
export const BADGE_DEFS: readonly BadgeDef[] = [
  { id: 'first_flight', name: '初次起飞', description: '完成第一节课程', unlockHint: '完成任意 1 节课程', isUnlocked: (m) => m.lessons >= 1 },
  { id: 'diligent_learner', name: '勤学不辍', description: '完成 5 节课程', unlockHint: '累计完成 5 节课程', isUnlocked: (m) => m.lessons >= 5 },
  { id: 'inspiration_source', name: '灵感之源', description: '作品被同伴 fork', unlockHint: '你的作品被他人 fork 1 次', isUnlocked: (m) => m.forks >= 1 },
  { id: 'arena_rookie', name: '赛场新星', description: '首次参赛获得名次', unlockHint: '参加 1 场赛事并获得名次', isUnlocked: (m) => m.competitions >= 1 },
  { id: 'certified_designer', name: '设计师认证', description: '成长积分达到 300', unlockHint: '累计成长积分达到 300', isUnlocked: (m) => m.totalPoints >= 300 },
  { id: 'chief_designer', name: '首席之冠', description: '成长积分达到 1000', unlockHint: '累计成长积分达到 1000', isUnlocked: (m) => m.totalPoints >= 1000 },
  { id: 'streak_week', name: '持之以恒', description: '连续学习打卡 7 天', unlockHint: '连续登录打卡满 7 天', isUnlocked: (m) => m.bestStreak >= 7 },
  { id: 'prolific_creator', name: '高产创作者', description: '发布 10 件原创作品', unlockHint: '累计发布 10 件作品', isUnlocked: (m) => m.published >= 10 },
  { id: 'popular_creator', name: '人气创作者', description: '作品累计获得 50 个赞', unlockHint: '你的作品累计被点赞 50 次', isUnlocked: (m) => m.likesReceived >= 50 },
];

// ===== 成长状态（页面消费）=====

export interface GrowthState {
  totalPoints: number;
  currentTier: GrowthTier;
  /** 下一层级；已封顶为 null。 */
  nextTier: GrowthTier | null;
  /** 当前层级内已累计的积分。 */
  pointsIntoCurrentTier: number;
  /** 距下一层级还需积分；封顶为 null。 */
  pointsToNextTier: number | null;
  /** 到下一层级的进度（0-100，clamp）；封顶为 100。 */
  progressPercent: number;
  metrics: GrowthMetrics;
  unlockedBadgeIds: BadgeId[];
  /** 去重后按 occurredAt 倒序（同时刻按 id 倒序稳定）。 */
  recentEvents: GrowthEvent[];
}

// ===== 摄入核心（纯函数；这是「接缝」：任何模块发来的真实事件流喂进来即可）=====

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * 把成长事件流聚合为成长状态。
 *
 * 规则：
 * ① 按 event.id 幂等去重（保留首次出现，重复上报不重复计分）；
 * ② 用 pointsForEvent 计分，统计度量；
 * ③ recentEvents 按 occurredAt 倒序、同时刻按 id 倒序；
 * ④ 空输入 → 学徒 / 0 分。
 */
export function ingestGrowthEvents(events: GrowthEvent[]): GrowthState {
  // ① 幂等去重
  const seen = new Set<string>();
  const unique: GrowthEvent[] = [];
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    unique.push(e);
  }

  // ② 计分 + 度量
  let totalPoints = 0;
  let lessons = 0;
  let forks = 0;
  let competitions = 0;
  let bestRank: number | null = null;
  let published = 0;
  let likesReceived = 0;
  let favoritesReceived = 0;
  let dailyTasks = 0;
  let bestStreak = 0;
  for (const e of unique) {
    totalPoints += pointsForEvent(e);
    switch (e.type) {
      case 'lesson_completed':
        lessons += 1;
        break;
      case 'project_was_forked':
        if (e.forkedByUserId !== e.userId) forks += 1;
        break;
      case 'competition_ranked':
        competitions += 1;
        if (Number.isInteger(e.rank) && e.rank > 0) {
          bestRank = bestRank === null ? e.rank : Math.min(bestRank, e.rank);
        }
        break;
      case 'project_published':
        published += 1;
        break;
      case 'project_liked':
        if (e.likedByUserId !== e.userId) likesReceived += 1;
        break;
      case 'project_favorited':
        if (e.favoritedByUserId !== e.userId) favoritesReceived += 1;
        break;
      case 'daily_task_completed':
        dailyTasks += 1;
        break;
      case 'login_streak':
        if (Number.isInteger(e.streakDays) && e.streakDays > bestStreak) {
          bestStreak = e.streakDays;
        }
        break;
    }
  }
  const metrics: GrowthMetrics = {
    totalPoints,
    lessons,
    forks,
    competitions,
    bestRank,
    published,
    likesReceived,
    favoritesReceived,
    dailyTasks,
    bestStreak,
  };

  // ③ 层级
  let currentTier: GrowthTier = GROWTH_TIERS[0];
  for (const t of GROWTH_TIERS) {
    if (totalPoints >= t.minPoints) currentTier = t;
  }
  const currentIdx = GROWTH_TIERS.findIndex((t) => t.id === currentTier.id);
  const nextTier: GrowthTier | null = GROWTH_TIERS[currentIdx + 1] ?? null;
  const pointsIntoCurrentTier = totalPoints - currentTier.minPoints;
  const pointsToNextTier = nextTier ? nextTier.minPoints - totalPoints : null;
  const progressPercent = nextTier
    ? clamp(Math.round((pointsIntoCurrentTier / (nextTier.minPoints - currentTier.minPoints)) * 100), 0, 100)
    : 100;

  // ④ 徽章
  const unlockedBadgeIds = BADGE_DEFS.filter((b) => b.isUnlocked(metrics)).map((b) => b.id);

  // ⑤ 最近事件（倒序，稳定）
  const recentEvents = [...unique].sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) return a.occurredAt < b.occurredAt ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  return {
    totalPoints,
    currentTier,
    nextTier,
    pointsIntoCurrentTier,
    pointsToNextTier,
    progressPercent,
    metrics,
    unlockedBadgeIds,
    recentEvents,
  };
}

// ===== 双层等级：段位内小等级 Lv.1→N（页面② 当前等级大卡）=====

/** 段位内每升一小级所需成长值（产品参数，仅改此处）。 */
export const SUBLEVEL_POINTS = 50;

export interface LevelState {
  /** 当前段位（学徒 / 设计师 / 首席）。 */
  tier: GrowthTier;
  /** 段位内小等级，从 1 起。 */
  subLevel: number;
  /** 当前小等级内已累计成长值。 */
  pointsIntoSubLevel: number;
  /** 距下一小级还需成长值（始终可继续升级，故恒为数字）。 */
  pointsToNextSubLevel: number;
}

/** 段位顺序索引（apprentice=0 / designer=1 / chief_designer=2）。 */
function tierOrder(id: GrowthTierId): number {
  return GROWTH_TIERS.findIndex((t) => t.id === id);
}

/**
 * 由累计成长值推导「段位 + 段位内小等级」。纯函数。
 *
 * 规则：进入某段位后，每 `SUBLEVEL_POINTS` 分升一小级，小等级从 1 起；
 * 跨入下一段位时小等级归位到新段位的 Lv.1（因小等级按当前段位 minPoints 起算）；
 * 顶段位（首席）小等级无上限。负分按 0 处理。
 */
export function levelOf(totalPoints: number): LevelState {
  const pts = Math.max(0, Math.floor(totalPoints));
  let tier: GrowthTier = GROWTH_TIERS[0];
  for (const t of GROWTH_TIERS) {
    if (pts >= t.minPoints) tier = t;
  }
  const pointsIntoTier = pts - tier.minPoints;
  const subLevel = Math.floor(pointsIntoTier / SUBLEVEL_POINTS) + 1;
  const pointsIntoSubLevel = pointsIntoTier % SUBLEVEL_POINTS;
  const pointsToNextSubLevel = SUBLEVEL_POINTS - pointsIntoSubLevel;
  return { tier, subLevel, pointsIntoSubLevel, pointsToNextSubLevel };
}

// ===== 权益 Perk（教育/荣誉解锁，零商业折扣；页面③ 等级特权网格）=====

export type PerkKind =
  | 'part_unlock' // 解锁新零件 / 新机身款式
  | 'course_unlock' // 解锁进阶课程
  | 'title' // 专属称号牌
  | 'avatar_frame' // 头像框 / 徽章挂件
  | 'showcase' // 作品精选展示位
  | 'badge' // 专属徽章
  | 'double_points' // 双倍成长值活动
  | 'class_rank'; // 班级榜上榜 / 老师认证（学校场景）

export interface Perk {
  id: string;
  name: string;
  /** 图标资源名（落 public/growth/perks/<icon>.png；缺图找军师生成）。 */
  icon: string;
  kind: PerkKind;
  /** 解锁所需段位。 */
  unlockTier: GrowthTierId;
  /** 段位内小等级门槛（可选，默认进段位即解锁）。 */
  unlockSubLevel?: number;
  /** 一句话权益说明（给孩子看）。 */
  desc: string;
}

/** 权益起步表（按段位递进；展示顺序即此顺序）。纯荣誉 / 创作解锁，无任何商业折扣。 */
export const PERKS: readonly Perk[] = [
  { id: 'title_apprentice', name: '学徒称号牌', icon: 'title-apprentice', kind: 'title', unlockTier: 'apprentice', desc: '主页挂上「学徒」专属称号' },
  { id: 'part_pack_basic', name: '基础零件包', icon: 'part-basic', kind: 'part_unlock', unlockTier: 'apprentice', unlockSubLevel: 3, desc: '解锁更多基础机身与机臂款式' },
  { id: 'avatar_frame_wood', name: '木纹头像框', icon: 'frame-wood', kind: 'avatar_frame', unlockTier: 'apprentice', unlockSubLevel: 5, desc: '给头像戴上木纹光环' },
  { id: 'course_advanced', name: '进阶课程', icon: 'course-advanced', kind: 'course_unlock', unlockTier: 'designer', desc: '解锁进阶设计与编程课程' },
  { id: 'showcase_featured', name: '作品精选位', icon: 'showcase', kind: 'showcase', unlockTier: 'designer', unlockSubLevel: 2, desc: '作品有机会进入社区精选展示位' },
  { id: 'double_points_event', name: '双倍成长值', icon: 'double-points', kind: 'double_points', unlockTier: 'designer', unlockSubLevel: 4, desc: '活动期间成长值翻倍' },
  { id: 'part_pack_pro', name: '高级零件包', icon: 'part-pro', kind: 'part_unlock', unlockTier: 'chief_designer', desc: '解锁全部高级零件与异形机身' },
  { id: 'class_rank_badge', name: '班级认证徽章', icon: 'class-rank', kind: 'class_rank', unlockTier: 'chief_designer', desc: '班级榜置顶 + 老师认证徽章' },
];

/**
 * 某累计成长值下，已解锁 / 未解锁的权益拆分（页面③ 已亮 / 置灰）。
 * 解锁条件：当前段位高于权益段位，或同段位且小等级达到门槛。
 */
export function perksFor(totalPoints: number): { unlocked: Perk[]; locked: Perk[] } {
  const { tier, subLevel } = levelOf(totalPoints);
  const curTierOrder = tierOrder(tier.id);
  const unlocked: Perk[] = [];
  const locked: Perk[] = [];
  for (const p of PERKS) {
    const reqTierOrder = tierOrder(p.unlockTier);
    const ok =
      curTierOrder > reqTierOrder ||
      (curTierOrder === reqTierOrder && subLevel >= (p.unlockSubLevel ?? 1));
    (ok ? unlocked : locked).push(p);
  }
  return { unlocked, locked };
}

// ===== 成长任务 Task（页面⑤ 成长任务中心：把「怎么涨分」做成明确清单）=====

export type TaskPeriod = 'daily' | 'achievement';

export interface GrowthTask {
  id: string;
  name: string;
  desc: string;
  period: TaskPeriod;
  /** 完成奖励成长值。 */
  rewardPoints: number;
  /** 目标次数。 */
  target: number;
  /** 成就型任务关联的累计度量（前端据此算进度）；每日型可省略（按当日行为单独跟踪）。 */
  metricKey?: keyof GrowthMetrics;
}

/** 成长任务起步表（每日 + 成就）。 */
export const GROWTH_TASKS: readonly GrowthTask[] = [
  { id: 'daily_lesson', name: '今日学习', desc: '完成 1 节课程', period: 'daily', rewardPoints: 20, target: 1 },
  { id: 'daily_create', name: '今日创作', desc: '发布 1 件作品', period: 'daily', rewardPoints: 40, target: 1 },
  { id: 'daily_checkin', name: '每日签到', desc: '登录打卡', period: 'daily', rewardPoints: 5, target: 1 },
  { id: 'ach_lessons_10', name: '勤学之路', desc: '累计完成 10 节课程', period: 'achievement', rewardPoints: 100, target: 10, metricKey: 'lessons' },
  { id: 'ach_publish_10', name: '创作之路', desc: '累计发布 10 件作品', period: 'achievement', rewardPoints: 120, target: 10, metricKey: 'published' },
  { id: 'ach_reused_5', name: '灵感领航', desc: '作品被复用 5 次', period: 'achievement', rewardPoints: 150, target: 5, metricKey: 'forks' },
];

// ===== 排行榜 Leaderboard（页面⑥ 成长排行榜；后端返回 Paginated<LeaderboardEntry>）=====

export type LeaderboardScope = 'global' | 'class';

export interface LeaderboardQuery {
  scope: LeaderboardScope;
  /** scope='class' 时必填，限定班级。 */
  classId?: string;
  page?: number;
  pageSize?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  totalPoints: number;
  tier: GrowthTierId;
  subLevel: number;
}
