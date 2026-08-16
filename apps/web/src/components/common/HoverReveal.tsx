import { cn } from '../../utils/cn'

/**
 * HoverReveal — RFC-020 悬停揭示图（航拍 / 作品图）。
 * - 默认 blur-sm + brightness-90，悬停 / 键盘聚焦时过渡到清晰。
 * - prefers-reduced-motion 下直接清晰（不做模糊→清晰过渡）。
 * - 可聚焦（tabIndex），保证键盘用户也能触发揭示。
 */
export interface HoverRevealProps {
  /** 图片地址 */
  image: string
  /** 图片替代文本 */
  alt: string
  /** 额外类名（如圆角、宽高比） */
  className?: string
}

export function HoverReveal({ image, alt, className }: HoverRevealProps) {
  return (
    <div
      tabIndex={0}
      className={cn(
        'group relative overflow-hidden rounded-card outline-none',
        className,
      )}
    >
      <img
        src={image}
        alt={alt}
        draggable={false}
        className={cn(
          'h-full w-full object-cover transition-[filter] duration-500',
          // 默认模糊略暗 → 悬停 / 聚焦清晰
          'blur-sm brightness-90 group-hover:blur-0 group-hover:brightness-100',
          'group-focus-visible:blur-0 group-focus-visible:brightness-100',
          // 尊重 reduced-motion：直接清晰
          'motion-reduce:blur-0 motion-reduce:brightness-100',
        )}
      />
    </div>
  )
}
