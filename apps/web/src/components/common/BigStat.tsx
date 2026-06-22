import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/**
 * BigStat — RFC-020 大号数据展示（学员数 / 获奖 / 课时 / 分数）。
 * - value 用 font-grotesk + text-stat（≥48px），label/unit 为小字说明。
 * - unit 紧贴数字右侧、稍小；label 在数字下方。
 */
export interface BigStatProps {
  /** 主数值（如 1200、98） */
  value: ReactNode
  /** 说明文字（如「累计学员」） */
  label: ReactNode
  /** 数值单位（如「+」「min」「人」），紧贴数字右侧 */
  unit?: ReactNode
  /** 额外类名 */
  className?: string
}

export function BigStat({ value, label, unit, className }: BigStatProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline gap-1 font-grotesk font-semibold text-ink-900 dark:text-slate-50">
        <span className="text-stat tabular-nums">{value}</span>
        {unit ? <span className="text-title-sm text-accent-spark">{unit}</span> : null}
      </div>
      <div className="text-label uppercase text-ink-400">{label}</div>
    </div>
  )
}
