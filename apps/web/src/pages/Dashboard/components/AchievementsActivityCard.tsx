import type { JSX, ComponentType } from 'react'
import {
  Rocket,
  Boxes,
  Heart,
  Lock,
  Award,
  ArrowRight,
  MessageCircle,
  ThumbsUp,
  ClipboardCheck,
  Trophy,
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import type {
  DashboardAchievement,
  DashboardActivity,
  ActivityType,
} from '../dashboardData'

/**
 * 成就徽章 + 近期动态卡片(工作台改版 §3.5)。
 * 上半「成就徽章」:展示 3 解锁 + 1 灰锁,每个徽章下显示触发条件(conditionText)。
 * 下半「近期动态」:获赞/评论/老师点评/参赛,右上「查看全部」,动态可点跳对应作品。
 * 名称/条件以 @fwx/shared 的 BADGE_DEFS 语义为准(示例数据已对齐)。
 */
export interface AchievementsActivityCardProps {
  achievements: DashboardAchievement[]
  activities: DashboardActivity[]
  /** 成就区「查看全部」→ 进徽章墙 */
  onViewBadges?: () => void
  /** 动态区「查看全部」→ 进成长/动态 */
  onViewActivities?: () => void
  /** 点单条动态 → 跳对应作品/社区帖 */
  onActivityClick?: (a: DashboardActivity) => void
}

type IconCmp = ComponentType<{ className?: string; strokeWidth?: number }>

/** iconKey → lucide 图标(契约里 BADGE_DEFS 的 id 即 iconKey;未知给合理默认 Award)。 */
const BADGE_ICONS: Record<string, IconCmp> = {
  first_flight: Rocket,
  prolific_creator: Boxes,
  popular_creator: Heart,
  locked: Lock,
}

const ACTIVITY_ICONS: Record<ActivityType, IconCmp> = {
  like: ThumbsUp,
  comment: MessageCircle,
  review: ClipboardCheck,
  competition: Trophy,
}

function BadgeItem({ badge }: { badge: DashboardAchievement }): JSX.Element {
  const Icon = badge.unlocked ? BADGE_ICONS[badge.iconKey] ?? Award : Lock
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          badge.unlocked
            ? 'bg-accent-gold/15 text-accent-gold ring-1 ring-accent-gold/30'
            : 'bg-slate-100 text-slate-300 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:ring-slate-700',
        )}
      >
        <Icon className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <span
        className={cn(
          'text-xs font-medium leading-tight',
          badge.unlocked ? 'text-sky-900 dark:text-sky-50' : 'text-slate-400 dark:text-slate-500',
        )}
      >
        {badge.name}
      </span>
      <span className="line-clamp-2 text-[11px] leading-tight text-slate-400 dark:text-slate-500">
        {badge.conditionText}
      </span>
    </div>
  )
}

export function AchievementsActivityCard({
  achievements,
  activities,
  onViewBadges,
  onViewActivities,
  onActivityClick,
}: AchievementsActivityCardProps): JSX.Element {
  return (
    <section
      className={cn(
        // 不裁内容：内容自适应高度（本卡通常最高，撑起等高行），不再用 overflow-hidden 切掉「近期动态」
        'relative flex h-full flex-col rounded-card border border-sky-100/70 bg-surface-white p-5',
        'shadow-soft transition-shadow duration-300 hover:shadow-sky-glow',
        'dark:border-slate-800 dark:bg-slate-900/70',
      )}
    >
      {/* 上半:成就徽章 */}
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-sky-900 dark:text-sky-50">成就徽章</h2>
        <button
          type="button"
          onClick={onViewBadges}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-pill px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          查看全部
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* 每行 2 个：给条件文案足够宽度，杜绝末字孤行（保/存、点/赞） */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
        {achievements.map((b, i) => (
          <BadgeItem key={`${b.iconKey}-${i}`} badge={b} />
        ))}
      </div>

      <div className="my-4 h-px bg-sky-100 dark:bg-slate-800" />

      {/* 下半:近期动态 */}
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-50">近期动态</h3>
        <button
          type="button"
          onClick={onViewActivities}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-pill px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          查看全部
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <ul className="mt-2 flex-1 space-y-1" role="list">
        {/* 最多 3 条，任何数据量下都不撑爆/被裁；更多走「查看全部」 */}
        {activities.slice(0, 3).map((a) => {
          const Icon = ACTIVITY_ICONS[a.type] ?? ThumbsUp
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => onActivityClick?.(a)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                  'hover:bg-sky-50 dark:hover:bg-sky-500/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1',
                )}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="flex-1 text-xs leading-snug text-slate-600 dark:text-slate-300">
                  {a.text}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
