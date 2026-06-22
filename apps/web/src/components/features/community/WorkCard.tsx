import type { CSSProperties } from 'react'
import { ImageOff, Heart, Bookmark } from 'lucide-react'
import type { PostCard } from '../../../hooks/useCommunityFeed'

function initials(name?: string) {
  return (name || '匿').trim().slice(0, 1)
}

/**
 * 社区作品卡（统一卡片）。借鉴站酷：
 * - 卡片本体不动、不抬升、不投影；只在 hover 时**封面放大、超出裁切**，质感来自这个动作。
 * - 封面锁 4:3 + object-cover；顶一层 3% 黑渐变压住亮白封面，让墙面整齐。
 * - 文字用「黑 + 透明度」：标题 90% / 作者 70% / 数据 50%；分隔/描边 5%。
 * 卡片只留 图 + 标题 + 作者，右下角小角标显示点赞/收藏量。点击打开快速预览弹窗。
 */
export function WorkCard({
  post,
  onOpen,
  style,
}: {
  post: PostCard
  onOpen: (post: PostCard) => void
  style?: CSSProperties
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(post)}
      style={style}
      className="group block w-full overflow-hidden rounded-2xl bg-white text-left ring-1 ring-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-safe:animate-[fwxRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-paper-100">
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff size={26} className="text-sky-200" />
          </div>
        )}
        {/* 封面防刺眼：3% 黑顶层渐变 */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.03]" />
        {/* hover「查看作品」提示（左下） */}
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-black/70 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
          查看作品
        </span>
        {/* 右下角小角标：点赞量 + 收藏量（常显、轻量） */}
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-2 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-black/55 ring-1 ring-black/[0.05] backdrop-blur-sm">
          <span className="inline-flex items-center gap-0.5">
            <Heart size={11} className={post.likedByMe ? 'text-rose-500' : 'text-rose-400'} fill={post.likedByMe ? 'currentColor' : 'none'} />
            {post.likeCount}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Bookmark size={11} className="text-sky-500" />
            {post.favoriteCount}
          </span>
        </div>
      </div>
      <div className="p-3.5">
        <h3 className="truncate text-sm font-medium text-black/90">{post.title}</h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[10px] font-semibold text-sky-600">
            {post.author?.avatar ? (
              <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(post.author?.username)
            )}
          </span>
          <span className="truncate text-xs text-black/60 transition-colors duration-150 group-hover:text-sky-600">
            {post.author?.username || '匿名'}
          </span>
        </div>
      </div>
    </button>
  )
}
