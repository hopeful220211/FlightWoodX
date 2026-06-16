import type { GrowthEvent } from '@fwx/shared'

/**
 * 成长事件样例（stub）。真实事件源（A 工作台 / B 创作 / D 竞赛 / E 社区）就绪后，
 * 把 growthApi.fetchGrowthEvents 指向后端即可删除本文件。
 *
 * 演示「设计师」档：6 节课(120) + 2 次被 fork(100) + 1 次季赛季军(120) ≈ 340 分。
 */
export const SAMPLE_GROWTH_EVENTS: GrowthEvent[] = [
  { id: 'g-l1', userId: 'me', type: 'lesson_completed', lessonId: 'mortise-intro', occurredAt: '2026-05-03T08:10:00.000Z' },
  { id: 'g-l2', userId: 'me', type: 'lesson_completed', lessonId: 'drone-lift', occurredAt: '2026-05-08T08:20:00.000Z' },
  { id: 'g-l3', userId: 'me', type: 'lesson_completed', lessonId: 'frame-design', occurredAt: '2026-05-14T09:00:00.000Z' },
  { id: 'g-l4', userId: 'me', type: 'lesson_completed', lessonId: 'motor-basics', occurredAt: '2026-05-20T09:30:00.000Z' },
  { id: 'g-l5', userId: 'me', type: 'lesson_completed', lessonId: 'prop-balance', occurredAt: '2026-05-26T10:00:00.000Z' },
  { id: 'g-l6', userId: 'me', type: 'lesson_completed', lessonId: 'first-flight', occurredAt: '2026-06-01T10:15:00.000Z' },
  { id: 'g-f1', userId: 'me', type: 'project_was_forked', projectId: 'wood-quad-v1', forkedByUserId: 'classmate-zhang', occurredAt: '2026-06-05T13:40:00.000Z' },
  { id: 'g-f2', userId: 'me', type: 'project_was_forked', projectId: 'wood-quad-v1', forkedByUserId: 'classmate-li', occurredAt: '2026-06-08T15:05:00.000Z' },
  { id: 'g-c1', userId: 'me', type: 'competition_ranked', competitionId: 'spring-cup-2026', rank: 3, occurredAt: '2026-06-12T16:30:00.000Z' },
]
