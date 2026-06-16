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
        'bg-white/90 backdrop-blur-sm rounded-lg border border-sky-100/60 shadow-soft transition-all duration-300',
        'dark:bg-slate-900/70 dark:border-slate-800 dark:shadow-slate-950/40',
        hoverable ? 'hover:shadow-lift hover:border-sky-200 hover:-translate-y-1' : undefined,
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

