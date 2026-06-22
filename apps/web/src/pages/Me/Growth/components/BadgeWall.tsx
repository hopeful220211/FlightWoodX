import {
  Rocket,
  BookOpen,
  Lightbulb,
  Medal,
  BadgeCheck,
  Crown,
  Flame,
  Boxes,
  Heart,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import { BADGE_DEFS, type BadgeId, type GrowthMetrics } from '@fwx/shared'
import { SectionLabel } from '../../../../components/common/SectionLabel'
import { cn } from '../../../../utils/cn'

export interface BadgeWallProps {
  /** 已解锁徽章 id 列表 */
  unlockedIds: BadgeId[]
  /** 聚合度量（预留，便于后续展示进度/数值） */
  metrics: GrowthMetrics
}

/** 徽章 → lucide 图标（按语义）。 */
const BADGE_ICON: Record<BadgeId, LucideIcon> = {
  first_flight: Rocket,
  diligent_learner: BookOpen,
  inspiration_source: Lightbulb,
  arena_rookie: Medal,
  certified_designer: BadgeCheck,
  chief_designer: Crown,
  streak_week: Flame,
  prolific_creator: Boxes,
  popular_creator: Heart,
}

/**
 * 块④ 徽章墙：全量徽章，已解锁高亮（金色调）、未解锁灰显 + 锁 + 获取提示；
 * 顶部显示收集进度。纯展示、props 驱动，grid 自适应。
 */
export function BadgeWall({ unlockedIds, metrics }: BadgeWallProps): JSX.Element {
  // metrics 预留给未来的数值展示；当前以 unlockedIds 为准。
  void metrics
  const unlocked = new Set(unlockedIds)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>徽章墙</SectionLabel>
        <span className="font-grotesk text-sm tabular-nums text-ink-400">
          {unlockedIds.length} / {BADGE_DEFS.length}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {BADGE_DEFS.map((badge) => {
          const Icon = BADGE_ICON[badge.id]
          const on = unlocked.has(badge.id)
          return (
            <div
              key={badge.id}
              className={cn(
                'relative flex flex-col items-center rounded-card border p-4 text-center transition',
                on
                  ? 'border-accent-gold/40 bg-accent-gold/5'
                  : 'border-ink-100 bg-black/[0.02] opacity-80',
              )}
              title={on ? badge.description : badge.unlockHint}
            >
              {!on && (
                <Lock
                  size={13}
                  className="absolute right-2.5 top-2.5 text-ink-400"
                  aria-hidden="true"
                />
              )}
              <div
                className={cn(
                  'mb-2 flex h-12 w-12 items-center justify-center rounded-full',
                  on ? 'bg-accent-gold/20 text-accent-gold' : 'bg-black/5 text-ink-400',
                )}
              >
                <Icon size={24} aria-hidden="true" />
              </div>
              <h4 className={cn('text-sm font-bold', on ? 'text-ink-900' : 'text-ink-600')}>
                {badge.name}
              </h4>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-400">
                {on ? badge.description : badge.unlockHint}
              </p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
