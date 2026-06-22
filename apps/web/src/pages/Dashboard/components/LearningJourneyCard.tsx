import type { JSX } from 'react'
import { ArrowRight, Plane, Play } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { ProgressBar } from '../../../components/common/ProgressBar'
import type { LearningJourney } from '../dashboardData'

/**
 * 学习旅程卡片(工作台改版 §3.3)。
 * 纯展示组件:课程层级 + 当前任务 + 进度条/百分比 + 主操作「继续学习」,
 * 右侧浅蓝无人机线框降低空白。所有数据由 props 注入,事件向上抛。
 */
export interface LearningJourneyCardProps {
  journey: LearningJourney
  /** 主操作「继续学习」→ 进下一节课 */
  onContinue?: () => void
  /** 右上「查看全部」→ 进课程详情 */
  onViewAll?: () => void
}

/** 右侧浅蓝无人机蓝图/线框装饰(CSS + lucide,纯装饰不抢内容)。 */
function DroneBlueprint(): JSX.Element {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -right-6 -top-2 hidden h-44 w-44 items-center justify-center sm:flex"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-100/70 to-transparent dark:from-sky-500/10" />
      {/* 同心环线框 */}
      <div className="absolute h-36 w-36 rounded-full border border-dashed border-sky-200/70 dark:border-sky-400/20" />
      <div className="absolute h-24 w-24 rounded-full border border-sky-200/60 dark:border-sky-400/15" />
      <Plane className="relative h-14 w-14 -rotate-45 text-sky-400/80 dark:text-sky-300/60" strokeWidth={1.25} />
    </div>
  )
}

export function LearningJourneyCard({
  journey,
  onContinue,
  onViewAll,
}: LearningJourneyCardProps): JSX.Element {
  return (
    <section
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-card border border-sky-100/70 bg-surface-white p-5',
        'shadow-soft transition-shadow duration-300 hover:shadow-sky-glow',
        'dark:border-slate-800 dark:bg-slate-900/70',
      )}
    >
      <DroneBlueprint />

      <header className="relative flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-sky-900 dark:text-sky-50">学习旅程</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-pill px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/10"
        >
          查看全部
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="relative mt-3 max-w-[78%] space-y-1">
        <p className="text-sm font-medium leading-snug text-sky-900 dark:text-sky-50">
          {journey.courseName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          阶段 · {journey.stageName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          当前任务 · {journey.currentLesson}
        </p>
      </div>

      <div className="relative mt-auto pt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">学习进度</span>
          <span className="font-grotesk font-semibold tabular-nums text-accent-spark">
            {Math.min(100, Math.max(0, journey.progress))}%
          </span>
        </div>
        <ProgressBar value={journey.progress} barClassName="bg-accent-spark" showLabel={false} />

        <button
          type="button"
          onClick={onContinue}
          className={cn(
            'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-pill px-4 py-2.5',
            'bg-accent-spark text-sm font-semibold text-white shadow-sky-glow',
            'transition hover:brightness-110 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2',
          )}
        >
          <Play className="h-4 w-4 fill-current" />
          继续学习
        </button>
      </div>
    </section>
  )
}
