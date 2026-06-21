import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImageOff, Heart, UserRound } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { FollowButton } from '../../components/features/community/FollowButton'
import { useAuthor } from '../../hooks/useFollow'

/** 创作者主页 /u/:userId：头部信息卡 + 其作品瀑布流（CSS columns，无限滚动）。 */
export function AuthorPage() {
  const { userId } = useParams<{ userId: string }>()
  const nav = useNavigate()

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useAuthor(userId)

  // 作者信息取第一页（每页都带回，取首页即可）；作品 flatMap 所有页。
  const author = data?.pages[0]?.author
  const posts = data ? data.pages.flatMap((p) => p.posts.items) : []

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

  // 首屏加载（还没有作者数据）。
  if (isLoading && !author) {
    return (
      <PageContainer className="py-8 space-y-6">
        <div className="h-28 animate-pulse rounded-lg bg-sky-50" />
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
      </PageContainer>
    )
  }

  if (isError || !author) {
    return (
      <PageContainer className="py-16">
        <div className="text-center">
          <p className="text-ink-400">没有找到这位创作者</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => refetch()}>重试</Button>
            <Button variant="ghost" size="sm" onClick={() => nav('/community')}>返回社区</Button>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <style>{'@keyframes fwxCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>

      {/* 头部信息卡：头像 + 用户名 + 关注者/关注数 + 关注按钮 */}
      <Card hoverable={false}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 ring-1 ring-sky-200">
              {author.avatar ? (
                <img src={author.avatar} alt={author.username} className="h-full w-full object-cover" />
              ) : (
                <UserRound size={28} className="text-sky-400" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-sky-900 sm:text-2xl">{author.username}</h1>
              <p className="mt-0.5 text-sm text-ink-400">
                <span className="font-semibold text-ink-700">{author.followerCount}</span> 关注者
                <span className="px-1.5 text-ink-300">·</span>
                <span className="font-semibold text-ink-700">{author.followingCount}</span> 关注
              </p>
            </div>
          </div>
          <FollowButton userId={author.id} initialFollowed={author.isFollowedByMe} />
        </div>
      </Card>

      {/* 作品瀑布流 / 空态 */}
      {posts.length === 0 ? (
        <div className="py-16 text-center text-ink-400">这位创作者还没有发布作品</div>
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
