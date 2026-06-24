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
  Star,
} from 'lucide-react'
import { levelOf, SUBLEVEL_POINTS } from '@fwx/shared'
import { cn } from '../../../utils/cn'
import type {
  DashboardAchievement,
  DashboardActivity,
  ActivityType,
} from '../dashboardData'

/**
 * 「我的成长」卡（成长并入工作台 · 军师决策单）。
 *
 * 顶部导航不再有独立「成长」页，成长中枢收进工作台这张卡，从上到下三块：
 *  ① 段位进度块（新增）：段位 + Lv + 成长值 + 金色升级进度条 + 距下一级还差多少；
 *     数值全部来自已冻结契约 `levelOf()` / `SUBLEVEL_POINTS`，不自造。
 *  ② 成就徽章（沿用 2×2 干净版式，`BADGE_DEFS` 语义）。
 *  ③ 近期动态（保留，3 条 + 查看全部）。
 * 完整成长详情（徽章墙 / 特权 / 排行榜 / 全部任务）收进「查看全部」→ 成长详情视图
 * （路由 /me/growth，但不挂顶部导航，由成长工程师产出；本卡只提供入口）。
 */
export interface MyGrowthCardProps {
  /** 累计成长值；段位/小等级/进度全部由 levelOf(totalPoints) 推导 */
  totalPoints: number
  achievements: DashboardAchievement[]
  activities: DashboardActivity[]
  /** 「查看全部」/ 段位块点击 → 成长详情（仅从工作台进入，不在顶部导航） */
  onViewDetail?: () => void
  /** 点单条动态 → 跳对应作品/社区帖 */
  onActivityClick?: (a: DashboardActivity) => void
}

type IconCmp = ComponentType<{ className?: string; strokeWidth?: number }>

/** iconKey → lucide 图标（契约里 BADGE_DEFS 的 id 即 iconKey；未知给合理默认 Award）。 */
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

/** ① 段位进度块：段位 + 成长值 + 金色进度条 + 距下一级还差多少。 */
function LevelProgress({
  totalPoints,
  onClick,
}: {
  totalPoints: number
  onClick?: () => void
}): JSX.Element {
  const lv = levelOf(totalPoints)
  const coldStart = totalPoints <= 0
  // 进度比例 = 当前小等级已获成长值 / 每级所需（50）
  const pct = Math.round((lv.pointsIntoSubLevel / SUBLEVEL_POINTS) * 100)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group/level block w-full rounded-2xl border border-accent-gold/30 p-4 text-left transition',
        'bg-gradient-to-br from-amber-50 to-white hover:border-accent-gold/50 hover:shadow-soft',
        'dark:border-accent-gold/20 dark:from-amber-500/10 dark:to-slate-900/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold/50 focus-visible:ring-offset-1',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-semibold text-sky-900 dark:text-sky-50">
          <Star className="h-4 w-4 shrink-0 fill-accent-gold text-accent-gold" strokeWidth={1.5} aria-hidden />
          <span className="truncate">
            {lv.tier.name} · Lv.{lv.subLevel}
          </span>
        </span>
        <span className="shrink-0 font-grotesk text-base font-bold tabular-nums text-sky-900 dark:text-sky-50">
          {totalPoints}
          <span className="ml-1 text-xs font-medium text-slate-400 dark:text-slate-500">成长值</span>
        </span>
      </div>

      {/* 金色升级进度条 */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/15">
        <div
          className="h-full rounded-full bg-[#F5B82E] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
        {coldStart ? (
          '完成第一个设计，赚到你的第一份成长值'
        ) : (
          <>
            距 {lv.tier.name} · Lv.{lv.subLevel + 1} 还差{' '}
            <span className="font-semibold tabular-nums text-accent-gold">{lv.pointsToNextSubLevel}</span> 成长值
          </>
        )}
      </p>
    </button>
  )
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

export function MyGrowthCard({
  totalPoints,
  achievements,
  activities,
  onViewDetail,
  onActivityClick,
}: MyGrowthCardProps): JSX.Element {
  return (
    <section
      className={cn(
        // 不裁内容：内容自适应高度（本卡通常最高，撑起等高行）
        'relative flex h-full flex-col rounded-card border border-sky-100/70 bg-surface-white p-5',
        'shadow-soft transition-shadow duration-300 hover:shadow-sky-glow',
        'dark:border-slate-800 dark:bg-slate-900/70',
      )}
    >
      {/* 卡标题 */}
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-sky-900 dark:text-sky-50">我的成长</h2>
        <button
          type="button"
          onClick={onViewDetail}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-pill px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          查看全部
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      {/* ① 段位进度块 */}
      <div className="mt-3">
        <LevelProgress totalPoints={totalPoints} onClick={onViewDetail} />
      </div>

      {/* ② 成就徽章 */}
      <h3 className="mt-5 text-sm font-semibold text-sky-900 dark:text-sky-50">成就徽章</h3>
      {/* 每行 2 个：给条件文案足够宽度，杜绝末字孤行 */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
        {achievements.map((b, i) => (
          <BadgeItem key={`${b.iconKey}-${i}`} badge={b} />
        ))}
      </div>

      <div className="my-4 h-px bg-sky-100 dark:bg-slate-800" />

      {/* ③ 近期动态 */}
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-50">近期动态</h3>
        <button
          type="button"
          onClick={onViewDetail}
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
