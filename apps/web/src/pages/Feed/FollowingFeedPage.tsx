import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { Users, Compass, Loader2, Heart } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useToggleLike } from '../../hooks/useCommunity'
import { MasonryGrid } from '../../components/features/community/MasonryGrid'
import { useFollowingFeed } from '../../hooks/useFollow'
import type { PostCard } from '../../hooks/useCommunityFeed'

interface FeedPage {
  items: PostCard[]
  total: number
  page: number
  pageSize: number
}

/** 我的关注 /feed：所关注创作者的最新作品瀑布流（MasonryGrid，无限滚动）。需登录。 */
export function FollowingFeedPage() {
  const nav = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFollowingFeed()
  const toggleLike = useToggleLike()

  const posts = useMemo(() => (data ? data.pages.flatMap((p) => p.items) : []), [data])

  // 本地乐观点赞：useToggleLike 只更新 ['community','posts']，关注流走 ['community','feed']，
  // 故在此就地翻转当前关注流无限缓存里对应作品；服务端写入交给 mutate，失败回滚。
  const onLike = (post: PostCard) => {
    if (!isLoggedIn) {
      toast.push('info', '登录后才能点赞哦')
      return
    }
    const key = ['community', 'feed'] as const
    const patch = (liked: boolean) =>
      qc.setQueryData<InfiniteData<FeedPage>>(key, (cur) =>
        cur
          ? {
              ...cur,
              pages: cur.pages.map((pg) => ({
                ...pg,
                items: pg.items.map((it) =>
                  it.id === post.id
                    ? { ...it, likedByMe: liked, likeCount: Math.max(0, it.likeCount + (liked ? 1 : -1)) }
                    : it,
                ),
              })),
            }
          : cur,
      )
    patch(!post.likedByMe)
    toggleLike.mutate({ id: post.id, liked: post.likedByMe }, { onError: () => patch(post.likedByMe) })
  }

  // 无限滚动：底部哨兵进入视口即加载下一页。
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '480px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // 未登录（含游客）兜底：理论上由 ProtectedRoute 拦截，这里再给一层友好引导。
  if (!isLoggedIn) {
    return (
      <PageContainer className="py-20">
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
            <Users size={24} className="text-sky-300" />
          </div>
          <p className="text-ink-400">登录后才能查看你的关注</p>
          <button
            onClick={() => nav('/login')}
            className="mt-4 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sky-600"
          >
            去登录
          </button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="py-10 lg:py-14">
      {/* ── Hero ── */}
      <header className="mb-8 lg:mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-500 ring-1 ring-sky-100">
          <Heart size={12} /> 我的关注
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 lg:text-4xl">关注动态</h1>
        <p className="mt-2 max-w-xl text-ink-400">你关注的创作者的最新作品，第一时间看到他们又拼出了什么新飞行器。</p>
      </header>

      {/* ── 三态 ── */}
      {isLoading ? (
        <div className="flex gap-5">
          {Array.from({ length: 4 }).map((_, c) => (
            <div key={c} className="flex flex-1 flex-col gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-sky-100">
                  <div className="aspect-[4/3] animate-pulse bg-sky-50" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-sky-50" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-sky-50" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 py-20 text-center">
          <p className="text-ink-400">关注动态加载失败了</p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sky-600"
          >
            重试
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
            <Users size={28} className="text-sky-300" />
          </div>
          <p className="text-ink-600">你还没有关注任何创作者</p>
          <p className="mt-1 text-sm text-ink-400">去社区逛逛，关注喜欢的小创客吧</p>
          <button
            onClick={() => nav('/community')}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sky-glow transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-sky-600 hover:shadow-lift active:scale-[0.97] motion-reduce:transition-none"
          >
            <Compass size={16} /> 去社区逛逛
          </button>
        </div>
      ) : (
        <>
          <MasonryGrid posts={posts} onLike={onLike} />
          <div ref={sentinelRef} className="h-8" aria-hidden="true" />
          {isFetchingNextPage && (
            <p className="flex items-center justify-center gap-2 pb-2 pt-4 text-sm text-ink-400">
              <Loader2 size={15} className="animate-spin" /> 加载更多…
            </p>
          )}
          {!hasNextPage && (
            <p className="flex items-center justify-center gap-1.5 pb-2 pt-8 text-center text-sm text-ink-200">
              <Heart size={13} /> 已经到底啦
            </p>
          )}
        </>
      )}
    </PageContainer>
  )
}
