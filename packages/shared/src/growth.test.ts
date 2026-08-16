import { describe, it, expect } from 'vitest';
import {
  ingestGrowthEvents,
  pointsForEvent,
  type LessonCompletedEvent,
  type ProjectWasForkedEvent,
  type CompetitionRankedEvent,
} from './growth';

/**
 * RFC-011-E4 验收：成长事件聚合的积分规则、层级阈值、徽章解锁、
 * 幂等去重、非法 rank、事件倒序、封顶与 clamp 边界。
 */

const U = 'user-1';
const lesson = (id: string, at = '2026-01-01T00:00:00.000Z'): LessonCompletedEvent => ({
  id, userId: U, type: 'lesson_completed', lessonId: `L-${id}`, occurredAt: at,
});
const forked = (id: string, by = 'other', at = '2026-01-01T00:00:00.000Z'): ProjectWasForkedEvent => ({
  id, userId: U, type: 'project_was_forked', projectId: `P-${id}`, forkedByUserId: by, occurredAt: at,
});
const ranked = (id: string, rank: number, at = '2026-01-01T00:00:00.000Z'): CompetitionRankedEvent => ({
  id, userId: U, type: 'competition_ranked', competitionId: `C-${id}`, rank, occurredAt: at,
});

describe('pointsForEvent', () => {
  it('完成关卡 = 20 分', () => {
    expect(pointsForEvent(lesson('a'))).toBe(20);
  });

  it('作品被他人 fork = 50 分；自刷 = 0', () => {
    expect(pointsForEvent(forked('a', 'other'))).toBe(50);
    expect(pointsForEvent(forked('a', U))).toBe(0);
  });

  it('参赛名次分档：1=200 / 前3=120 / 前10=60 / 其余=40', () => {
    expect(pointsForEvent(ranked('a', 1))).toBe(200);
    expect(pointsForEvent(ranked('a', 2))).toBe(120);
    expect(pointsForEvent(ranked('a', 3))).toBe(120);
    expect(pointsForEvent(ranked('a', 4))).toBe(60);
    expect(pointsForEvent(ranked('a', 10))).toBe(60);
    expect(pointsForEvent(ranked('a', 11))).toBe(40);
  });

  it('非法 rank（非正、非整、NaN）= 0 分', () => {
    expect(pointsForEvent(ranked('a', 0))).toBe(0);
    expect(pointsForEvent(ranked('a', -5))).toBe(0);
    expect(pointsForEvent(ranked('a', 1.5))).toBe(0);
    expect(pointsForEvent(ranked('a', Number.NaN))).toBe(0);
  });
});

describe('ingestGrowthEvents', () => {
  it('空输入 → 学徒 / 0 分 / 无徽章 / 无事件', () => {
    const s = ingestGrowthEvents([]);
    expect(s.totalPoints).toBe(0);
    expect(s.currentTier.id).toBe('apprentice');
    expect(s.nextTier?.id).toBe('designer');
    expect(s.pointsToNextTier).toBe(300);
    expect(s.progressPercent).toBe(0);
    expect(s.unlockedBadgeIds).toEqual([]);
    expect(s.recentEvents).toEqual([]);
  });

  it('幂等：相同 id 事件不重复计分', () => {
    const s = ingestGrowthEvents([lesson('dup'), lesson('dup'), lesson('dup')]);
    expect(s.totalPoints).toBe(20);
    expect(s.metrics.lessons).toBe(1);
    expect(s.recentEvents).toHaveLength(1);
  });

  it('层级阈值命中：250 分仍是学徒，进度 83%', () => {
    // 5 次被 fork = 250 分
    const s = ingestGrowthEvents([0, 1, 2, 3, 4].map((i) => forked(`f${i}`)));
    expect(s.totalPoints).toBe(250);
    expect(s.currentTier.id).toBe('apprentice');
    expect(s.pointsToNextTier).toBe(50);
    expect(s.progressPercent).toBe(83); // round(250/300*100)
  });

  it('层级阈值命中：刚好 300 分进入设计师，层内进度归零', () => {
    // 6 次被 fork = 300 分
    const s = ingestGrowthEvents([0, 1, 2, 3, 4, 5].map((i) => forked(`f${i}`)));
    expect(s.totalPoints).toBe(300);
    expect(s.currentTier.id).toBe('designer');
    expect(s.pointsIntoCurrentTier).toBe(0);
    expect(s.pointsToNextTier).toBe(700);
    expect(s.progressPercent).toBe(0);
    expect(s.unlockedBadgeIds).toContain('certified_designer');
  });

  it('封顶：>=1000 分为首席，nextTier / pointsToNextTier 为 null，进度 100', () => {
    // 5 次冠军 = 1000 分
    const s = ingestGrowthEvents([0, 1, 2, 3, 4].map((i) => ranked(`c${i}`, 1)));
    expect(s.totalPoints).toBe(1000);
    expect(s.currentTier.id).toBe('chief_designer');
    expect(s.nextTier).toBeNull();
    expect(s.pointsToNextTier).toBeNull();
    expect(s.progressPercent).toBe(100);
    expect(s.unlockedBadgeIds).toContain('chief_designer');
  });

  it('徽章解锁：完成 1 / 5 课、被 fork、参赛各自触发', () => {
    const oneLesson = ingestGrowthEvents([lesson('1')]);
    expect(oneLesson.unlockedBadgeIds).toContain('first_flight');
    expect(oneLesson.unlockedBadgeIds).not.toContain('diligent_learner');

    const fiveLessons = ingestGrowthEvents([0, 1, 2, 3, 4].map((i) => lesson(`l${i}`)));
    expect(fiveLessons.unlockedBadgeIds).toEqual(expect.arrayContaining(['first_flight', 'diligent_learner']));

    expect(ingestGrowthEvents([forked('1')]).unlockedBadgeIds).toContain('inspiration_source');
    expect(ingestGrowthEvents([ranked('1', 5)]).unlockedBadgeIds).toContain('arena_rookie');
  });

  it('自刷 fork 不计分也不计入 forks，不解锁灵感之源', () => {
    const s = ingestGrowthEvents([forked('self', U)]);
    expect(s.totalPoints).toBe(0);
    expect(s.metrics.forks).toBe(0);
    expect(s.unlockedBadgeIds).not.toContain('inspiration_source');
  });

  it('非法 rank：不计分但计入参赛次数，bestRank 取合法名次最小值', () => {
    const s = ingestGrowthEvents([ranked('bad', 0), ranked('mid', 5), ranked('top', 2)]);
    expect(s.metrics.competitions).toBe(3);
    expect(s.metrics.bestRank).toBe(2);
    expect(s.totalPoints).toBe(60 + 120); // rank0=0, rank5=60, rank2=120
  });

  it('recentEvents 按 occurredAt 倒序（最新在前）', () => {
    const s = ingestGrowthEvents([
      lesson('old', '2026-01-01T00:00:00.000Z'),
      lesson('new', '2026-03-01T00:00:00.000Z'),
      lesson('mid', '2026-02-01T00:00:00.000Z'),
    ]);
    expect(s.recentEvents.map((e) => e.id)).toEqual(['new', 'mid', 'old']);
  });

  it('progressPercent 始终 clamp 在 0-100', () => {
    const s = ingestGrowthEvents([lesson('a'), lesson('b')]); // 40 分
    expect(s.progressPercent).toBeGreaterThanOrEqual(0);
    expect(s.progressPercent).toBeLessThanOrEqual(100);
  });
});
