import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/**
 * BigStat — 数据展示（学员数 / 获奖 / 课时 / 分数）。
 * - `lg`（默认）：RFC-020 营销大字 `text-stat`（48px），首页落地页在用，行为不可改。
 * - `sm`：仪表盘密集区档（28px），用于工作台 5 连排小卡，避免 48px 在窄列里溢出。
 * - value 始终 `min-w-0 + truncate + tabular-nums`，任何长值都不溢出、不跨卡重叠。
 */
export interface BigStatProps {
  /** 主数值（如 1200、98） */
  value: ReactNode
  /** 说明文字（如「累计学员」） */
  label: ReactNode
  /** 数值单位（如「+」「min」「人」），紧贴数字右侧 */
  unit?: ReactNode
  /** 尺寸档：`lg`=营销大字 48px（默认，首页在用）；`sm`=仪表盘 28px */
  size?: 'lg' | 'sm'
  /** 额外类名 */
  className?: string
}

const SIZE_STYLES: Record<'lg' | 'sm', { wrap: string; value: string; unit: string }> = {
  lg: { wrap: 'gap-2', value: 'text-stat', unit: 'text-title-sm' },
  sm: { wrap: 'gap-1', value: 'text-[1.75rem] leading-none', unit: 'text-sm' },
}

export function BigStat({ value, label, unit, size = 'lg', className }: BigStatProps) {
  const s = SIZE_STYLES[size]
  return (
    <div className={cn('flex min-w-0 flex-col', s.wrap, className)}>
      <div className="flex min-w-0 items-baseline gap-1 font-grotesk font-semibold text-ink-900 dark:text-slate-50">
        <span className={cn('min-w-0 truncate tabular-nums', s.value)}>{value}</span>
        {unit ? <span className={cn('shrink-0 text-accent-spark', s.unit)}>{unit}</span> : null}
      </div>
      <div className="truncate text-label uppercase text-ink-400">{label}</div>
    </div>
  )
}
