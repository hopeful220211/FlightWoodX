import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { Heart, Search, ImageOff } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useToggleLike } from '../../hooks/useCommunity'
import { useCommunityFeed, type FeedMode, type TrendingWindow, type PostCard } from '../../hooks/useCommunityFeed'

// 标签 → (mode, window)。最新走 /posts(sort=new)，三个热门走 /trending。
type TabKey = 'new' | 'day' | 'week' | 'all'
const TABS: { key: TabKey; label: string; mode: FeedMode; window?: TrendingWindow }[] = [
  { key: 'new', label: '最新', mode: 'new' },
  { key: 'day', label: '热门·今日', mode: 'trending', window: 'day' },
  { key: 'week', label: '热门·本周', mode: 'trending', window: 'week' },
  { key: 'all', label: '热门·总榜', mode: 'trending', window: 'all' },
]

type FeedData = InfiniteData<{ items: PostCard[]; total: number; page: number; pageSize: number }>

export function CommunityPage() {
  const nav = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const [tab, setTab] = useState<TabKey>('new')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  // q 只在「最新」标签生效（搜索仍命中 /posts）。
  const params = { mode: active.mode, window: active.window, q: active.mode === 'new' ? q : undefined }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCommunityFeed(params)
  const toggleLike = useToggleLike()

  const posts = data ? data.pages.flatMap((p) => p.items) : []

  const submitSearch = () => {
    setTab('new')
    setQ(qInput.trim())
  }

  // 本地乐观：useToggleLike 只更新 ['community','posts'] 缓存，瀑布流走 ['community','infinite']，
  // 故在此对当前 infinite 缓存就地翻转 likedByMe/likeCount；服务端写入交给 toggleLike.mutate，
  // 失败时回滚本地缓存（mutate 自身的回滚不覆盖 infinite 缓存）。
  const onLike = (post: PostCard) => {
    if (!isLoggedIn) {
      toast.push('info', '登录后才能点赞哦')
      return
    }
    const key = ['community', 'infinite', { mode: params.mode, window: params.window, q: params.q }]
    const nextLiked = !post.likedByMe
    const patch = (liked: boolean) =>
      qc.setQueryData<FeedData>(key, (cur) =>
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
    patch(nextLiked)
    toggleLike.mutate(
      { id: post.id, liked: post.likedByMe },
      { onError: () => patch(post.likedByMe) },
    )
  }

  // 无限滚动：IntersectionObserver 监听底部哨兵（不用 scroll 监听）。
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

  return (
    <PageContainer className="py-8 space-y-6">
      {/* 卡片入场：单个局部 keyframe（非新视觉体系），仅 motion-safe 下生效 */}
      <style>{'@keyframes fwxCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}'}</style>
      <PageHeader title="社区作品库" />

      {/* 搜索 + 标签 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sky-400" />
          <Input
            placeholder="搜索作品..."
            className="pl-10"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
          />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto border-b border-sky-100">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 ${
                tab === t.key
                  ? 'text-sky-600 font-semibold border-b-2 border-sky-500 -mb-px'
                  : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 三态 */}
      {isLoading ? (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
          {Array.from({ length: 8 }).map((_, i) => (
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
          <p className="text-ink-400">加载社区作品失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>重试</Button>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 text-center text-ink-400">
          {active.mode === 'new' && q
            ? `没有找到与「${q}」相关的作品`
            : active.mode === 'trending'
              ? '这个榜单还没有上榜作品，先去点赞支持喜欢的作品吧！'
              : '社区还没有作品，去把你的作品发布到社区吧！'}
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
                <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onLike(post) }}
                    className={`inline-flex items-center gap-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                      post.likedByMe ? 'text-rose-500' : 'hover:text-rose-400'
                    }`}
                    aria-pressed={post.likedByMe}
                    aria-label={post.likedByMe ? '取消点赞' : '点赞'}
                  >
                    <Heart size={13} fill={post.likedByMe ? 'currentColor' : 'none'} />
                    {post.likeCount}
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* 底部哨兵：进入视口即加载下一页 */}
          <div ref={sentinelRef} className="h-10" aria-hidden="true" />
          {isFetchingNextPage && (
            <p className="pb-2 text-center text-sm text-ink-400">加载中…</p>
          )}
          {!hasNextPage && posts.length > 0 && (
            <p className="pb-2 text-center text-sm text-ink-300">没有更多作品了</p>
          )}
        </>
      )}
    </PageContainer>
  )
}
