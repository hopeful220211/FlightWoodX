import { useCallback, useState } from 'react'
import { Heart } from 'lucide-react'

// 点赞手感：心形过冲回弹 + 一圈火花扩散上浮（数值借鉴站酷/antd 的弹出缓动）。
const KEYFRAMES =
  '@keyframes fwxLikePop{0%{transform:scale(.5) rotate(-10deg)}45%{transform:scale(1.35) rotate(7deg)}70%{transform:scale(.9) rotate(-3deg)}85%{transform:scale(1.08)}100%{transform:scale(1)}}' +
  '@keyframes fwxLikeBurst{0%{transform:scale(.4);opacity:.55}100%{transform:scale(2.3);opacity:0}}'

/**
 * 统一点赞按钮（弹窗 / 详情页共用），保证手感一致。
 * liked 时玫红实心；点击未赞→赞 时播放回弹 + 火花。功能由父级 onToggle 决定（登录门控也在父级）。
 */
export function LikeButton({
  liked,
  count,
  onToggle,
  className = '',
}: {
  liked: boolean
  count: number
  onToggle: () => void
  className?: string
}) {
  const [burst, setBurst] = useState(0)
  const handle = useCallback(() => {
    if (!liked) setBurst((b) => b + 1) // 只在「赞上去」时迸发
    onToggle()
  }, [liked, onToggle])

  return (
    <button
      type="button"
      onClick={handle}
      aria-pressed={liked}
      aria-label={liked ? '取消点赞' : '点赞'}
      className={`relative inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
        liked
          ? 'bg-rose-500 text-white hover:bg-rose-600'
          : 'border border-sky-200 bg-white text-black/70 hover:border-rose-200 hover:text-rose-500'
      } ${className}`}
    >
      <style>{KEYFRAMES}</style>
      <span className="relative inline-flex h-[15px] w-[15px] items-center justify-center">
        <Heart
          key={burst}
          size={15}
          fill={liked ? 'currentColor' : 'none'}
          className={burst > 0 && liked ? 'motion-safe:animate-[fwxLikePop_0.5s_cubic-bezier(0.22,1,0.36,1)]' : ''}
        />
        {burst > 0 && liked && (
          <span
            key={`b${burst}`}
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-rose-400/0 opacity-0 ring-2 ring-rose-300 motion-safe:animate-[fwxLikeBurst_0.5s_ease-out]"
          />
        )}
      </span>
      {count}
    </button>
  )
}
