import type { GrowthMetrics } from '@fwx/shared'
import { BigStat } from '../../../../components/common/BigStat'
import { cn } from '../../../../utils/cn'

export interface ProfileHeaderProps {
  /** 昵称 */
  nickname: string
  /** 头像 URL；无则用昵称首字母占位 */
  avatarUrl?: string
  /** 当前段位称号（学徒 / 设计师 / 首席设计师） */
  tierName: string
  /** 累计成长值 */
  totalPoints: number
  /** 聚合度量（课程 / 发布 / 获赞等） */
  metrics: GrowthMetrics
}

/** 取昵称首字符作头像占位（兼容中英文 / emoji）。 */
function initialOf(nickname: string): string {
  const trimmed = nickname.trim()
  return trimmed ? Array.from(trimmed)[0].toUpperCase() : '?'
}

/**
 * 块① 顶部个人卡：头像（无则首字母占位）+ 段位称号 + 关键数字条。
 * 纯展示、props 驱动；浅 sky 基调，对比度 ≥ AA。
 */
export function ProfileHeader({
  nickname,
  avatarUrl,
  tierName,
  totalPoints,
  metrics,
}: ProfileHeaderProps): JSX.Element {
  return (
    <section
      className={cn(
        'rounded-card border border-sky-100 bg-surface-white p-6 sm:p-8',
        'shadow-sky-glow',
      )}
    >
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
        {/* 头像 / 首字母占位 */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${nickname} 的头像`}
            className="h-20 w-20 shrink-0 rounded-full border-2 border-white object-cover shadow-sky-glow sm:h-24 sm:w-24"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              'flex h-20 w-20 shrink-0 items-center justify-center rounded-full sm:h-24 sm:w-24',
              'border-2 border-white bg-sky-100 font-grotesk text-h3 font-semibold text-sky-600 shadow-sky-glow',
            )}
          >
            {initialOf(nickname)}
          </div>
        )}

        {/* 昵称 + 段位 */}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-grotesk text-h3 font-semibold text-ink-900">{nickname}</h1>
          <span
            className={cn(
              'mt-2 inline-flex items-center rounded-pill bg-sky-100 px-3 py-1',
              'text-title-sm font-medium text-sky-700',
            )}
          >
            {tierName}
          </span>
        </div>
      </div>

      {/* 关键数字条 */}
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-sky-100 pt-6 sm:grid-cols-4 sm:gap-6">
        <BigStat value={totalPoints} label="成长值" />
        <BigStat value={metrics.lessons} label="完成课程" />
        <BigStat value={metrics.published} label="发布作品" />
        <BigStat value={metrics.likesReceived} label="获得赞" />
      </div>
    </section>
  )
}
