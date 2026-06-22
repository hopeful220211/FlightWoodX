import type { JSX } from 'react'
import { CheckCircle2, Circle, Send } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { WeeklyGoal } from '../dashboardData'

/**
 * 本周目标卡片(工作台改版 §3.4 · 本轮最关键的交互补强)。
 *
 * 任务清单对应真实成长任务 `GROWTH_TASKS`(@fwx/shared):
 *   - 「学习一节课程」≈ daily_lesson  ·「完成新设计并保存」≈ daily_create
 *   - 「为作品添加备注/签到」≈ daily_checkin  ·「浏览社区」「仿真试飞」为闭环占位
 * 完成态给真实成长值由后端结算,前端只渲染清单 + 勾选样式 + 跳转。
 * comingSoon 的任务(仿真试飞,RFC-015 未上线)显示「即将开放」且置灰不可点。
 */
export interface WeeklyGoalsCardProps {
  goals: WeeklyGoal[]
  done: number
  total: number
  resetDays: number
  /** 点未完成且非占位的任务 → 跳对应页 */
  onGoalClick?: (g: WeeklyGoal) => void
}

/** 右侧纸飞机轨迹插画(CSS 虚线轨迹 + lucide 纸飞机,纯装饰)。 */
function PaperPlaneTrail(): JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none absolute right-4 top-4 hidden sm:block">
      <svg width="84" height="56" viewBox="0 0 84 56" fill="none" className="text-sky-300/70 dark:text-sky-400/30">
        <path
          d="M2 52 C 24 50, 40 34, 78 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <Send className="absolute -right-1 -top-1 h-5 w-5 -rotate-12 text-accent-spark/80" strokeWidth={1.5} />
    </div>
  )
}

export function WeeklyGoalsCard({
  goals,
  done,
  total,
  resetDays,
  onGoalClick,
}: WeeklyGoalsCardProps): JSX.Element {
  return (
    <section
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-card border border-sky-100/70 bg-surface-white p-5',
        'shadow-soft transition-shadow duration-300 hover:shadow-sky-glow',
        'dark:border-slate-800 dark:bg-slate-900/70',
      )}
    >
      <PaperPlaneTrail />

      <header className="relative">
        <h2 className="text-base font-semibold text-sky-900 dark:text-sky-50">本周目标</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          本周目标{' '}
          <span className="font-grotesk font-semibold tabular-nums text-accent-spark">
            {done}/{total}
          </span>
          ;距离周目标重置 {resetDays} 天
        </p>
      </header>

      <ul className="relative mt-4 flex-1 space-y-1.5" role="list">
        {goals.map((g, i) => {
          const locked = g.comingSoon === true
          const clickable = !locked && !g.completed
          return (
            <li key={`${g.title}-${i}`}>
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onGoalClick?.(g) : undefined}
                aria-label={g.title}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors',
                  clickable
                    ? 'cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-500/10'
                    : 'cursor-default',
                  locked && 'opacity-55',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1',
                )}
              >
                {g.completed ? (
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 fill-accent-spark text-white"
                    strokeWidth={2}
                  />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" strokeWidth={2} />
                )}
                <span
                  className={cn(
                    'flex-1 leading-snug',
                    g.completed
                      ? 'text-slate-400 line-through dark:text-slate-500'
                      : 'text-sky-900 dark:text-sky-50',
                  )}
                >
                  {g.title}
                </span>
                {locked && (
                  <span className="shrink-0 rounded-tag bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400 dark:bg-slate-800 dark:text-slate-400">
                    即将开放
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
