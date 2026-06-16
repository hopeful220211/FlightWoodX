import { Sprout, PenTool, Crown, Check, Lock, type LucideIcon } from 'lucide-react'
import { GROWTH_TIERS, type GrowthTierId } from '@fwx/shared'
import { cn } from '../../../../utils/cn'

const TIER_ICON: Record<GrowthTierId, LucideIcon> = {
  apprentice: Sprout,
  designer: PenTool,
  chief_designer: Crown,
}

export interface TierLadderProps {
  currentTierId: GrowthTierId
  totalPoints: number
}

/** 身份阶梯：三段身份卡，高亮当前、标记已达成 / 未解锁。响应式：移动纵向、桌面三列。 */
export function TierLadder({ currentTierId, totalPoints }: TierLadderProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {GROWTH_TIERS.map((tier) => {
        const Icon = TIER_ICON[tier.id]
        const isCurrent = tier.id === currentTierId
        const reached = totalPoints >= tier.minPoints
        const locked = !reached
        return (
          <div
            key={tier.id}
            className={cn(
              'relative rounded-2xl border p-5 transition',
              isCurrent
                ? 'border-sky-400 bg-sky-50 shadow-lift ring-2 ring-sky-300'
                : reached
                  ? 'border-success/30 bg-success/5'
                  : 'border-black/10 bg-white opacity-70',
            )}
          >
            {isCurrent && (
              <span className="absolute right-3 top-3 rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white">
                当前身份
              </span>
            )}
            <div
              className={cn(
                'mb-3 flex h-12 w-12 items-center justify-center rounded-xl',
                isCurrent
                  ? 'bg-sky-600 text-white'
                  : reached
                    ? 'bg-success/15 text-success'
                    : 'bg-ink-100 text-ink-400',
              )}
            >
              <Icon size={24} aria-hidden="true" />
            </div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-lg font-bold text-ink-900">{tier.name}</h3>
              {reached && !isCurrent && <Check size={16} className="text-success" aria-hidden="true" />}
              {locked && <Lock size={14} className="text-ink-400" aria-hidden="true" />}
            </div>
            <p className="mt-1 text-sm text-ink-500">{tier.blurb}</p>
            <p className="mt-3 text-xs font-semibold text-ink-400">
              {tier.minPoints === 0 ? '起始身份' : `需 ${tier.minPoints} 积分`}
              {locked && ` · 还差 ${tier.minPoints - totalPoints} 分`}
            </p>
          </div>
        )
      })}
    </div>
  )
}
