import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, ImageOff, Bookmark } from 'lucide-react'
import type { PostCard } from '../../../hooks/useCommunityFeed'

function initials(name?: string) {
  return (name || '匿').trim().slice(0, 1)
}

/**
 * 社区作品卡（瀑布流统一卡片）。社区广场 / 作者页 / 关注流 / 合集详情共用，保证视觉一致。
 * onLike 传入时显示可点的悬浮点赞胶囊；不传则只读展示计数。
 */
export function WorkCard({
  post,
  onLike,
  style,
}: {
  post: PostCard
  onLike?: (post: PostCard) => void
  style?: CSSProperties
}) {
  const nav = useNavigate()
  return (
    <article
      onClick={() => nav(`/community/${post.id}`)}
      style={style}
      className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-sky-100 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-lift hover:ring-sky-200 motion-safe:animate-[fwxRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-sky-50 to-sky-100/40">
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff size={26} className="text-sky-200" />
          </div>
        )}
        {onLike && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onLike(post) }}
            aria-pressed={post.likedByMe}
            aria-label={post.likedByMe ? '取消点赞' : '点赞'}
            className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
              post.likedByMe
                ? 'bg-rose-500 text-white shadow-soft'
                : 'bg-white/85 text-ink-500 opacity-0 group-hover:opacity-100 hover:text-rose-500'
            }`}
          >
            <Heart size={13} fill={post.likedByMe ? 'currentColor' : 'none'} />
            {post.likeCount > 0 && post.likeCount}
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate font-semibold text-ink-900">{post.title}</h3>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[11px] font-semibold text-sky-600">
              {post.author?.avatar ? (
                <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(post.author?.username)
              )}
            </span>
            <span className="truncate text-sm text-ink-500">{post.author?.username || '匿名'}</span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Heart size={12} className={post.likedByMe ? 'text-rose-400' : ''} fill={post.likedByMe ? 'currentColor' : 'none'} />
              {post.likeCount}
            </span>
            {post.favoriteCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Bookmark size={12} />
                {post.favoriteCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
