import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ImageOff, Heart, Users } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { useAuthStore } from '../../stores/authStore'
import { useFollowingFeed } from '../../hooks/useFollow'

/** 我的关注 /feed：所关注创作者的最新作品瀑布流（无限滚动）。需登录。 */
export function FollowingFeedPage() {
  const nav = useNavigate()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useFollowingFeed()

  const posts = data ? data.pages.flatMap((p) => p.items) : []

  // 无限滚动：底部哨兵进入视口即加载下一页。
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '320px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // 未登录（含游客）兜底：理论上由 ProtectedRoute 拦截，这里再给一层友好引导。
  if (!isLoggedIn) {
    return (
      <PageContainer className="py-16">
        <div className="text-center text-ink-400">
          <p>登录后才能查看你的关注</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => nav('/login')}>去登录</Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <style>{'@keyframes fwxCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
      <PageHeader title="我的关注" description="你关注的创作者的最新作品" />

      {isLoading ? (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-5 break-inside-avoid rounded-lg bg-white ring-1 ring-sky-100 overflow-hidden">
              <div className="aspect-[4/3] bg-sky-50 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-sky-50 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-sky-50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-16 text-center">
          <p className="text-ink-400">加载关注流失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>重试</Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center">
          <Users size={32} className="mx-auto text-sky-200" />
          <p className="mt-3 text-ink-400">你还没有关注任何创作者，去社区逛逛吧</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => nav('/community')}>逛逛社区</Button>
        </div>
      ) : (
        <>
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="group mb-5 break-inside-avoid cursor-pointer overflow-hidden motion-safe:animate-[fwxCardIn_0.4s_ease]"
                onClick={() => nav(`/community/${post.id}`)}
              >
                <div className="aspect-[4/3] overflow-hidden rounded-t-lg bg-sky-50 -mx-4 -mt-4 mb-4 flex items-center justify-center">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff size={28} className="text-sky-200" />
                  )}
                </div>
                <h3 className="font-semibold text-ink-900 truncate">{post.title}</h3>
                <p className="text-sm text-ink-400 mt-0.5 truncate">{post.author?.username || '匿名'}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-ink-400">
                  <Heart size={13} fill={post.likedByMe ? 'currentColor' : 'none'} className={post.likedByMe ? 'text-rose-500' : ''} />
                  {post.likeCount}
                </div>
              </Card>
            ))}
          </div>

          <div ref={sentinelRef} className="h-10" aria-hidden="true" />
          {isFetchingNextPage && <p className="pb-2 text-center text-sm text-ink-400">加载中…</p>}
          {!hasNextPage && posts.length > 0 && (
            <p className="pb-2 text-center text-sm text-ink-300">没有更多作品了</p>
          )}
        </>
      )}
    </PageContainer>
  )
}
