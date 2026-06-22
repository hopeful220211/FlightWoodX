import { ArrowUpRight } from 'lucide-react'
import { levelOf, SUBLEVEL_POINTS, type GrowthTierId } from '@fwx/shared'
import { cn } from '../../../../utils/cn'

export interface LevelCardProps {
  /** 累计成长值 */
  totalPoints: number
  /** 点击「怎么涨↗」入口 */
  onHowToEarn?: () => void
}

/** 段位 → 3D 徽章图（public 根路径）。 */
const TIER_BADGE: Record<GrowthTierId, string> = {
  apprentice: '/growth/badges/tier-apprentice.png',
  designer: '/growth/badges/tier-designer.png',
  chief_designer: '/growth/badges/tier-chief.png',
}

/** 段位 → 浅色 sky 渐变背景（不上深色）。 */
const TIER_GRADIENT: Record<GrowthTierId, string> = {
  apprentice: 'bg-gradient-to-br from-sky-50 via-surface-white to-sky-100',
  designer: 'bg-gradient-to-br from-sky-100 via-sky-50 to-sky-200',
  chief_designer: 'bg-gradient-to-br from-sky-200 via-sky-100 to-sky-50',
}

/**
 * 块② 当前等级大卡（视觉重心）：超大 Lv. 数字 + 段位名 + 3D 徽章 +
 * 段位内小等级进度条 + 升级文案 + 「怎么涨↗」入口。
 * 背景渐变随段位变（三套浅色 sky）。纯展示、props 驱动。
 */
export function LevelCard({ totalPoints, onHowToEarn }: LevelCardProps): JSX.Element {
  const { tier, subLevel, pointsIntoSubLevel, pointsToNextSubLevel } = levelOf(totalPoints)
  const percent = Math.round((pointsIntoSubLevel / SUBLEVEL_POINTS) * 100)

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-card border border-sky-100 p-6 sm:p-8',
        'shadow-sky-glow',
        TIER_GRADIENT[tier.id],
      )}
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* 3D 段位徽章 */}
        <img
          src={TIER_BADGE[tier.id]}
          alt={`${tier.name} 段位徽章`}
          className="h-32 w-32 shrink-0 object-contain drop-shadow-[0_8px_24px_rgba(42,136,219,0.25)] sm:h-40 sm:w-40"
        />

        {/* 等级 + 段位 + 进度 */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex items-baseline justify-center gap-3 sm:justify-start">
            <span className="font-grotesk text-hero font-semibold leading-none text-ink-900">
              Lv.{subLevel}
            </span>
            <span className="text-title-sm font-medium text-sky-700">{tier.name}</span>
          </div>
          <p className="mt-2 text-sm text-ink-600">{tier.blurb}</p>

          {/* 进度条 */}
          <div className="mt-5">
            <div
              className="h-3 w-full overflow-hidden rounded-pill bg-white/70"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="当前小等级升级进度"
            >
              <div
                className="h-full rounded-pill bg-accent-spark transition-[width] motion-reduce:transition-none"
                style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-grotesk text-sm tabular-nums text-ink-600">
                {pointsIntoSubLevel} / {SUBLEVEL_POINTS}
              </span>
              <span className="text-sm text-ink-600">
                再 <span className="font-grotesk font-semibold text-accent-spark">{pointsToNextSubLevel}</span> 分升级
              </span>
            </div>
          </div>

          {/* 「怎么涨↗」入口 */}
          {onHowToEarn ? (
            <button
              type="button"
              onClick={onHowToEarn}
              className={cn(
                'mt-5 inline-flex items-center gap-1 rounded-pill border border-sky-200 bg-white/70 px-4 py-2',
                'text-sm font-medium text-sky-700 transition hover:border-accent-spark hover:text-accent-spark',
              )}
            >
              怎么涨
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
