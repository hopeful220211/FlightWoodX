import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 卡片头部 */
  header?: ReactNode
  /** 卡片底部 */
  footer?: ReactNode
  /** hover 上浮阴影 */
  hoverable?: boolean
}

export function Card({ header, footer, hoverable = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        // UI/UX 优化：更柔和的阴影与毛玻璃效果（文档要求）
        'bg-white/80 backdrop-blur-sm rounded-lg shadow-lg shadow-wood-100/50 transition-all duration-300',
        'dark:bg-slate-900/70 dark:shadow-slate-950/40',
        hoverable ? 'hover:shadow-xl hover:shadow-wood-200/60 hover:-translate-y-1' : undefined,
        className,
      )}
      {...rest}
    >
      {header ? <div className="border-b border-black/5 p-4 dark:border-white/10">{header}</div> : null}
      <div className="p-4">{children}</div>
      {footer ? <div className="border-t border-black/5 p-4 dark:border-white/10">{footer}</div> : null}
    </div>
  )
}

