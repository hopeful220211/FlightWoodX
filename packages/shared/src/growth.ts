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

export type GrowthEventType = 'lesson_completed' | 'project_was_forked' | 'competition_ranked';

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

export type GrowthEvent = LessonCompletedEvent | ProjectWasForkedEvent | CompetitionRankedEvent;

// ===== 积分规则（集中 shared，事件源零认知负担）=====

/**
 * 单事件积分。
 * - lesson_completed：20
 * - project_was_forked：50（自刷 = 0）
 * - competition_ranked：rank 非正整数 = 0；1 = 200；前 3 = 120；前 10 = 60；其余 = 40（参与基础分）
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
  }
}

// ===== 度量（聚合中间量，徽章解锁判定输入）=====

export interface GrowthMetrics {
  totalPoints: number;
  /** 完成课程数（去重事件后）。 */
  lessons: number;
  /** 作品被有效 fork 次数（排除自刷）。 */
  forks: number;
  /** 参赛次数（去重事件后）。 */
  competitions: number;
  /** 历史最好名次（仅统计合法 rank），无则 null。 */
  bestRank: number | null;
}

// ===== 徽章（声明式：isUnlocked 仅在本包内被 ingest 调用，页面只读 unlockedBadgeIds）=====

export type BadgeId =
  | 'first_flight'
  | 'diligent_learner'
  | 'inspiration_source'
  | 'arena_rookie'
  | 'certified_designer'
  | 'chief_designer';

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
    }
  }
  const metrics: GrowthMetrics = { totalPoints, lessons, forks, competitions, bestRank };

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
