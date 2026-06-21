import type { CSSProperties } from 'react'
import { ImageOff, Heart, Bookmark } from 'lucide-react'
import type { PostCard } from '../../../hooks/useCommunityFeed'

function initials(name?: string) {
  return (name || '匿').trim().slice(0, 1)
}

// 确定性挑一个封面比例，让瀑布流高低错落（Pinterest 风），而非整齐一致。
const ASPECTS = ['aspect-[4/5]', 'aspect-square', 'aspect-[4/3]', 'aspect-[5/6]', 'aspect-[3/4]', 'aspect-[7/8]']
function aspectFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return ASPECTS[h % ASPECTS.length]
}

/**
 * 社区作品卡（瀑布流统一卡片）。
 * 卡片只留：作品图 + 标题 + 作者（点赞/收藏移到弹窗/详情，不在角上碍眼）。
 * 点击触发 onOpen（打开快速预览弹窗），不直接跳页。
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
      className="group block w-full overflow-hidden rounded-2xl bg-white text-left shadow-soft ring-1 ring-black/[0.04] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1.5 hover:shadow-lift hover:ring-sky-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-safe:animate-[fwxRise_0.5s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      <div className={`relative ${aspectFor(post.id)} overflow-hidden bg-gradient-to-br from-paper-100 to-sky-50/60`}>
        {post.coverUrl ? (
          <img
            src={post.coverUrl}
            alt={post.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05] motion-reduce:transition-none"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageOff size={26} className="text-sky-200" />
          </div>
        )}
        {/* 悬停时柔光遮罩 + 查看提示（仅 hover 出现，不堆数字在角上） */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-ink-700 opacity-0 shadow-soft backdrop-blur-sm transition-all duration-300 group-hover:opacity-100">
          查看作品
        </span>
        {/* 右下角小角标：点赞量 + 收藏量（常显、轻量） */}
        <div className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex items-center gap-2 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-ink-600 shadow-soft ring-1 ring-black/5 backdrop-blur-sm">
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
        <h3 className="truncate text-sm font-semibold text-ink-900">{post.title}</h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[10px] font-semibold text-sky-600">
            {post.author?.avatar ? (
              <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(post.author?.username)
            )}
          </span>
          <span className="truncate text-xs text-ink-500">{post.author?.username || '匿名'}</span>
        </div>
      </div>
    </button>
  )
}
