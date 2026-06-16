import { Rocket, BookOpen, GitFork, Medal, BadgeCheck, Crown, Lock, type LucideIcon } from 'lucide-react'
import { BADGE_DEFS, type BadgeId } from '@fwx/shared'
import { cn } from '../../../../utils/cn'

const BADGE_ICON: Record<BadgeId, LucideIcon> = {
  first_flight: Rocket,
  diligent_learner: BookOpen,
  inspiration_source: GitFork,
  arena_rookie: Medal,
  certified_designer: BadgeCheck,
  chief_designer: Crown,
}

export interface BadgeGridProps {
  unlockedIds: BadgeId[]
}

/** 徽章墙：全量徽章，已解锁高亮（金色）、未解锁灰显 + 锁 + 获取提示。 */
export function BadgeGrid({ unlockedIds }: BadgeGridProps) {
  const unlocked = new Set(unlockedIds)
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BADGE_DEFS.map((badge) => {
        const Icon = BADGE_ICON[badge.id]
        const on = unlocked.has(badge.id)
        return (
          <div
            key={badge.id}
            className={cn(
              'relative flex flex-col items-center rounded-2xl border p-4 text-center transition',
              on ? 'border-accent-gold/40 bg-accent-gold/5' : 'border-black/10 bg-black/[0.02] opacity-80',
            )}
            title={on ? badge.description : badge.unlockHint}
          >
            {!on && <Lock size={13} className="absolute right-2.5 top-2.5 text-ink-400" aria-hidden="true" />}
            <div
              className={cn(
                'mb-2 flex h-12 w-12 items-center justify-center rounded-full',
                on ? 'bg-accent-gold/20 text-accent-gold' : 'bg-black/5 text-ink-400',
              )}
            >
              <Icon size={24} aria-hidden="true" />
            </div>
            <h4 className={cn('text-sm font-bold', on ? 'text-ink-900' : 'text-ink-500')}>{badge.name}</h4>
            <p className="mt-0.5 text-xs text-ink-400">{on ? badge.description : badge.unlockHint}</p>
          </div>
        )
      })}
    </div>
  )
}
