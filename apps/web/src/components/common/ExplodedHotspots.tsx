import { ArrowRight } from 'lucide-react'
import { cn } from '../../utils/cn'

/**
 * ExplodedHotspots — RFC-020 产品爆炸图 + 编号热点讲解。
 * - 图上按 x/y 百分比定位渲染点睛蓝编号圆；左侧/下方列出文字一一对应。
 * - moreHref 可选渲染「了解更多」链接。
 * - 响应式：移动端图与文字纵向堆叠，桌面端左图右文。
 */
export interface Hotspot {
  /** 编号（显示在圆圈内，也用于左侧列表对应） */
  n: number
  /** 横向定位（百分比 0–100） */
  x: number
  /** 纵向定位（百分比 0–100） */
  y: number
  /** 该热点标题 */
  title: string
  /** 该热点说明 */
  desc: string
}

export interface ExplodedHotspotsProps {
  /** 爆炸/分解图地址（透明 PNG 最佳） */
  image: string
  /** 图片替代文本 */
  alt?: string
  /** 热点列表 */
  hotspots: Hotspot[]
  /** 「了解更多」链接，可选 */
  moreHref?: string
  /** 额外类名 */
  className?: string
}

export function ExplodedHotspots({
  image,
  alt = '',
  hotspots,
  moreHref,
  className,
}: ExplodedHotspotsProps) {
  return (
    <div className={cn('grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center', className)}>
      {/* 图 + 叠加编号圆 */}
      <div className="relative">
        <img src={image} alt={alt} className="w-full select-none" draggable={false} />
        {hotspots.map((h) => (
          <span
            key={h.n}
            className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-accent-spark font-grotesk text-sm font-semibold text-white shadow-sky-glow"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
            aria-hidden
          >
            {h.n}
          </span>
        ))}
      </div>

      {/* 文字对应列表 */}
      <ul className="flex flex-col gap-6">
        {hotspots.map((h) => (
          <li key={h.n} className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-spark font-grotesk text-sm font-semibold text-white">
              {h.n}
            </span>
            <div>
              <div className="font-grotesk text-title-sm font-medium text-ink-900 dark:text-slate-50">
                {h.title}
              </div>
              <p className="mt-1 text-ink-600 dark:text-slate-300">{h.desc}</p>
            </div>
          </li>
        ))}
        {moreHref ? (
          <li>
            <a
              href={moreHref}
              className="inline-flex items-center gap-1 font-grotesk font-medium text-accent-spark hover:gap-2 transition-[gap]"
            >
              了解更多
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            </a>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
