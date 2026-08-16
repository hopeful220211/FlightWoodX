import { cn } from '../../utils/cn'

/**
 * TechLabel — RFC-020 仪表盘式技术参数标注（如「飞行高度 120m / 续航 25min」）。
 * - 等宽字体（font-mono）渲染 k/v 对，键小写灰、值点睛或墨色。
 * - 横向排列、键值上下堆叠，营造仪表盘读数感。
 */
export interface TechLabelItem {
  /** 参数名（如「飞行高度」） */
  k: string
  /** 参数值（如「120m」） */
  v: string
}

export interface TechLabelProps {
  /** 参数列表 */
  items: TechLabelItem[]
  /** 额外类名 */
  className?: string
}

export function TechLabel({ items, className }: TechLabelProps) {
  return (
    <dl className={cn('flex flex-wrap gap-x-10 gap-y-4 font-mono', className)}>
      {items.map((item) => (
        <div key={item.k} className="flex flex-col gap-1">
          <dt className="text-label uppercase text-ink-400">{item.k}</dt>
          <dd className="text-title-sm font-medium text-ink-900 dark:text-slate-50">{item.v}</dd>
        </div>
      ))}
    </dl>
  )
}
