import {
  Boxes,
  GraduationCap,
  BadgeCheck,
  Frame,
  Star,
  Medal,
  Zap,
  Trophy,
  Lock,
  type LucideIcon,
} from 'lucide-react'
import {
  perksFor,
  PERKS,
  GROWTH_TIERS,
  type Perk,
  type PerkKind,
  type GrowthTierId,
} from '@fwx/shared'
import { SectionLabel } from '../../../../components/common/SectionLabel'
import { cn } from '../../../../utils/cn'

export interface PerkGridProps {
  /** 累计成长值 */
  totalPoints: number
}

/** 权益类型 → lucide 占位图标（真图后续生成）。 */
const PERK_ICON: Record<PerkKind, LucideIcon> = {
  part_unlock: Boxes,
  course_unlock: GraduationCap,
  title: BadgeCheck,
  avatar_frame: Frame,
  showcase: Star,
  badge: Medal,
  double_points: Zap,
  class_rank: Trophy,
}

/** 段位 id → 展示名。 */
const TIER_NAME: Record<GrowthTierId, string> = GROWTH_TIERS.reduce(
  (acc, t) => ({ ...acc, [t.id]: t.name }),
  {} as Record<GrowthTierId, string>,
)

/** 解锁门槛文案：「设计师」或「设计师 · Lv.2」。 */
function unlockLabel(perk: Perk): string {
  const tier = TIER_NAME[perk.unlockTier]
  return perk.unlockSubLevel && perk.unlockSubLevel > 1 ? `${tier} · Lv.${perk.unlockSubLevel}` : tier
}

/**
 * 块③ 等级特权网格：展示全部权益，已解锁高亮、未解锁置灰 + 锁标 + 解锁门槛。
 * 权益图暂用 lucide 占位。纯展示、props 驱动，grid 自适应。
 */
export function PerkGrid({ totalPoints }: PerkGridProps): JSX.Element {
  const { unlocked } = perksFor(totalPoints)
  const unlockedIds = new Set(unlocked.map((p) => p.id))

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <SectionLabel>等级特权</SectionLabel>
        <span className="font-grotesk text-sm tabular-nums text-ink-400">
          {unlocked.length} / {PERKS.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PERKS.map((perk) => {
          const Icon = PERK_ICON[perk.kind]
          const on = unlockedIds.has(perk.id)
          return (
            <div
              key={perk.id}
              className={cn(
                'relative flex gap-3 rounded-card border p-4 transition',
                on
                  ? 'border-sky-200 bg-surface-white'
                  : 'border-ink-100 bg-black/[0.02] opacity-80',
              )}
            >
              {!on && (
                <Lock
                  size={14}
                  className="absolute right-3 top-3 text-ink-400"
                  aria-hidden="true"
                />
              )}
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-tag',
                  on ? 'bg-sky-100 text-sky-600' : 'bg-black/5 text-ink-400',
                )}
              >
                <Icon size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className={cn('text-sm font-bold', on ? 'text-ink-900' : 'text-ink-600')}>
                  {perk.name}
                </h4>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{perk.desc}</p>
                {!on && (
                  <p className="mt-1.5 text-xs font-medium text-ink-400">
                    解锁门槛：{unlockLabel(perk)}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
