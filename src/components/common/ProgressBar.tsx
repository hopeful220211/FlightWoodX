import { cn } from '../../utils/cn'

export interface ProgressBarProps {
  /** 0-100 */
  value: number
  /** 颜色 class（如 bg-tech-600） */
  barClassName?: string
  className?: string
  showLabel?: boolean
}

export function ProgressBar({ value, barClassName, className, showLabel = true }: ProgressBarProps) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('w-full', className)}>
      <div className="h-3 w-full rounded-full bg-black/10 dark:bg-white/10">
        <div
          className={cn('h-3 rounded-full bg-tech-600 transition-[width]', barClassName)}
          style={{ width: `${v}%` }}
        />
      </div>
      {showLabel ? <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{v}%</div> : null}
    </div>
  )
}

