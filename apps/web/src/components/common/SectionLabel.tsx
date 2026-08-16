import type { ReactNode } from 'react'
import { cn } from '../../utils/cn'

/**
 * SectionLabel — RFC-020 大写小标签（章节名 / 分类）。
 * - 字号走 text-label（13px + 字距 1.2px，已在令牌内），强制大写。
 * - vertical 为真时竖排（writing-mode），用于侧栏纵向标注。
 * - 默认色用低饱和 ink-400 保证 AA 对比；可用 className 覆盖为 spark 点睛。
 */
export interface SectionLabelProps {
  /** 标签文案 */
  children: ReactNode
  /** 竖排显示 */
  vertical?: boolean
  /** 额外类名（如需点睛蓝 text-accent-spark） */
  className?: string
}

export function SectionLabel({ children, vertical = false, className }: SectionLabelProps) {
  return (
    <span
      className={cn(
        'inline-block font-grotesk font-medium uppercase text-label text-ink-400',
        vertical && '[writing-mode:vertical-rl] rotate-180',
        className,
      )}
    >
      {children}
    </span>
  )
}
