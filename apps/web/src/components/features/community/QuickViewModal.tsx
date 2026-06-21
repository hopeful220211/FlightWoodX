import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Share2, Maximize2, ImageOff, User, ZoomIn, X } from 'lucide-react'
import { useToast } from '../../common/Toast'
import { useAuthStore } from '../../../stores/authStore'
import { useCommunityPost, useToggleLike } from '../../../hooks/useCommunity'
import { CommentSection } from './CommentSection'
import { SaveToCollectionButton } from './SaveToCollectionButton'
import { ReuseButton } from './ReuseButton'

const EASE = 'ease-[cubic-bezier(0.22,1,0.36,1)]'

/**
 * 作品快速预览弹窗（Pinterest 式详情弹窗）。点击作品卡弹出，不跳页。
 *
 * 桌面：左右两栏 —— 左侧作品大图铺满半幅、落在柔和纸/天蓝渐变上；
 *      右侧可独立滚动 —— 标题 / 作者行 / 操作胶囊 / 描述 / 评论。
 * 移动（<lg）：竖向堆叠 —— 图在上（限高 ~50vh），信息+评论在下，整窗滚动。
 *
 * 浮动控件：左上角 ← 关闭（ESC / ← / 点背景同样关闭），右上「展开」进完整作品页。
 * 点击大图打开内联灯箱（放大查看），点背景或 ESC 关灯箱。
 */
export function QuickViewModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const nav = useNavigate()
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)
  const { data: post, isLoading } = useCommunityPost(postId)
  const toggleLike = useToggleLike()

  // 内联灯箱（放大查看大图）。开着时 ESC 先关灯箱，不关弹窗。
  const [zoomed, setZoomed] = useState(false)

  // 键盘：ESC / ← 关闭（灯箱优先）；并锁定背景滚动。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'ArrowLeft') {
        if (zoomed) {
          setZoomed(false)
          return
        }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, zoomed])

  const coverUrl = post?.project?.coverUrl

  const onLike = useCallback(() => {
    if (!post) return
    if (!isLoggedIn) {
      toast.push('info', '登录后才能点赞哦')
      return
    }
    toggleLike.mutate({ id: post.id, liked: post.likedByMe })
  }, [post, isLoggedIn, toast, toggleLike])

  const expand = () => {
    nav(`/community/${postId}`)
    onClose()
  }

  const goAuthor = () => {
    if (!post?.author?.id) return
    nav(`/u/${post.author.id}`)
    onClose()
  }

  const share = async () => {
    if (!post) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/community/${post.id}`)
      toast.push('success', '链接已复制')
    } catch {
      toast.push('info', '复制失败，请手动复制')
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-950/60 p-3 backdrop-blur-sm motion-safe:animate-[fwxQvFade_0.22s_ease] sm:p-6 lg:items-center ${EASE}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={post?.title ? `作品预览：${post.title}` : '作品预览'}
    >
      <style>
        {'@keyframes fwxQvFade{from{opacity:0}to{opacity:1}}@keyframes fwxQvPop{from{opacity:0;transform:translateY(14px) scale(0.97)}to{opacity:1;transform:none}}@keyframes fwxQvZoom{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:none}}'}
      </style>

      <div
        className={`relative my-auto flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-black/5 motion-safe:animate-[fwxQvPop_0.34s_cubic-bezier(0.22,1,0.36,1)] lg:max-h-[90vh] lg:flex-row ${EASE}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 浮动控件：左上 ← 关闭、右上「展开」，始终高对比、永不被裁切 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭"
          className={`absolute left-3 top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-ink-700 shadow-lift ring-1 ring-black/5 backdrop-blur-md transition hover:scale-105 hover:bg-white hover:text-ink-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:hover:scale-100 ${EASE}`}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          type="button"
          onClick={expand}
          aria-label="展开查看完整作品"
          className={`absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3.5 py-2 text-sm font-semibold text-ink-700 shadow-lift ring-1 ring-black/5 backdrop-blur-md transition hover:scale-[1.03] hover:bg-white hover:text-sky-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:hover:scale-100 ${EASE}`}
        >
          <Maximize2 size={15} /> 展开
        </button>

        {isLoading || !post ? (
          /* ── 加载骨架 ── */
          <>
            <div className="aspect-[4/3] w-full shrink-0 animate-pulse bg-gradient-to-br from-paper-100 to-sky-50/60 lg:aspect-auto lg:h-auto lg:w-1/2 motion-reduce:animate-none" />
            <div className="w-full space-y-4 p-6 pt-16 lg:w-1/2 lg:p-8 lg:pt-16">
              <div className="h-7 w-2/3 animate-pulse rounded-lg bg-paper-100 motion-reduce:animate-none" />
              <div className="h-5 w-1/3 animate-pulse rounded-full bg-paper-100 motion-reduce:animate-none" />
              <div className="flex gap-2 pt-2">
                <div className="h-10 w-20 animate-pulse rounded-full bg-paper-100 motion-reduce:animate-none" />
                <div className="h-10 w-24 animate-pulse rounded-full bg-paper-100 motion-reduce:animate-none" />
              </div>
              <div className="space-y-2 pt-3">
                <div className="h-4 w-full animate-pulse rounded bg-paper-100 motion-reduce:animate-none" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-paper-100 motion-reduce:animate-none" />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ── 左 / 上：作品大图 ── */}
            <div className="relative flex max-h-[50vh] w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-paper-100 via-paper-50 to-sky-50/70 lg:max-h-none lg:w-1/2">
              {coverUrl ? (
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  aria-label="放大查看"
                  className="group relative block h-full w-full focus-visible:outline-none"
                >
                  <img
                    src={coverUrl}
                    alt={post.title}
                    className={`h-full max-h-[50vh] w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none lg:max-h-[90vh] ${EASE}`}
                  />
                  {/* 放大提示：hover / focus 时浮现 */}
                  <span
                    className={`pointer-events-none absolute bottom-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-ink-700 opacity-0 shadow-soft ring-1 ring-black/5 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none ${EASE}`}
                  >
                    <ZoomIn size={13} /> 放大查看
                  </span>
                </button>
              ) : (
                <div className="flex flex-col items-center gap-3 py-20 text-sky-300">
                  <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/70 shadow-soft ring-1 ring-sky-100">
                    <ImageOff size={28} />
                  </span>
                  <span className="text-xs font-medium text-ink-400">这件作品还没有封面图</span>
                </div>
              )}
            </div>

            {/* ── 右 / 下：信息 + 操作 + 评论（桌面独立滚动） ── */}
            <div className="flex min-h-0 w-full flex-col lg:w-1/2 lg:overflow-y-auto">
              <div className="border-b border-paper-200/70 px-6 pb-6 pt-16 lg:px-8">
                {post.forkFrom && (
                  <p className="mb-2.5 inline-flex items-center rounded-full bg-paper-100 px-2.5 py-1 text-[11px] font-medium text-ink-500">
                    基于 @{post.forkFrom.authorName || '某位创作者'} 的《{post.forkFrom.title}》再创作
                  </p>
                )}
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink-900">{post.title}</h2>

                {/* 作者行 → /u/:id */}
                <button
                  type="button"
                  onClick={goAuthor}
                  className={`group mt-4 flex items-center gap-2.5 rounded-full py-1 pr-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${EASE}`}
                >
                  <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-sky-200/60 text-xs font-semibold text-sky-600 ring-1 ring-sky-100">
                    {post.author?.avatar ? (
                      <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={16} />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-ink-700 transition-colors group-hover:text-sky-600">
                    {post.author?.username || '匿名创作者'}
                  </span>
                </button>

                {/* 操作胶囊：窄屏自动换行 */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onLike}
                    aria-pressed={post.likedByMe}
                    aria-label={post.likedByMe ? '取消点赞' : '点赞'}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold tabular-nums transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:active:scale-100 ${EASE} ${
                      post.likedByMe
                        ? 'bg-rose-500 text-white shadow-soft hover:bg-rose-600'
                        : 'border border-sky-200 bg-white text-ink-700 hover:border-rose-200 hover:text-rose-500'
                    }`}
                  >
                    <Heart
                      size={15}
                      fill={post.likedByMe ? 'currentColor' : 'none'}
                      className={`transition-transform ${EASE} ${post.likedByMe ? 'scale-110 motion-reduce:scale-100' : ''}`}
                    />
                    {post.likeCount}
                  </button>

                  <SaveToCollectionButton postId={post.id} />
                  {post.project && (
                    <ReuseButton postId={post.id} projectId={post.project.id} reusable={post.project.reusable} />
                  )}

                  <button
                    type="button"
                    onClick={share}
                    className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-sky-200 bg-white px-4 text-sm font-semibold text-ink-700 transition-all active:scale-95 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:active:scale-100 ${EASE}`}
                  >
                    <Share2 size={15} /> 分享
                  </button>
                </div>

                {post.description && (
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{post.description}</p>
                )}
              </div>

              {/* 评论：桌面随右栏滚动，移动随整窗滚动 */}
              <div className="px-6 py-6 lg:px-8">
                <CommentSection postId={post.id} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── 内联灯箱：满幅大图 + 暗背景，点背景 / ESC / ✕ 关闭 ── */}
      {zoomed && coverUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/90 p-4 backdrop-blur-sm motion-safe:animate-[fwxQvFade_0.2s_ease] sm:p-8"
          onClick={(e) => {
            e.stopPropagation()
            setZoomed(false)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="放大查看"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setZoomed(false)
            }}
            aria-label="关闭放大"
            className={`absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-md transition hover:scale-105 hover:bg-white/25 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 motion-reduce:hover:scale-100 ${EASE}`}
          >
            <X size={20} />
          </button>
          <img
            src={coverUrl}
            alt={post?.title ?? ''}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-lift motion-safe:animate-[fwxQvZoom_0.28s_cubic-bezier(0.22,1,0.36,1)]"
          />
        </div>
      )}
    </div>
  )
}
