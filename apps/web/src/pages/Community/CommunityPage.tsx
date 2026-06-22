import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ImageOff, Sparkles, Loader2, Trophy } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { useCommunityFeed, type FeedMode, type TrendingWindow } from '../../hooks/useCommunityFeed'
import { CommunityShell } from '../../components/features/community/CommunityShell'
import { MasonryGrid } from '../../components/features/community/MasonryGrid'

// 标签 → (mode, window)。最新走 /posts(sort=new)，三个热门走 /trending。
type TabKey = 'new' | 'day' | 'week' | 'all'
const TABS: { key: TabKey; label: string; mode: FeedMode; window?: TrendingWindow }[] = [
  { key: 'new', label: '最新', mode: 'new' },
  { key: 'day', label: '今日热门', mode: 'trending', window: 'day' },
  { key: 'week', label: '本周热门', mode: 'trending', window: 'week' },
  { key: 'all', label: '总榜', mode: 'trending', window: 'all' },
]

export function CommunityPage() {
  const [tab, setTab] = useState<TabKey>('new')
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const params = { mode: active.mode, window: active.window, q: active.mode === 'new' ? q : undefined }

  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCommunityFeed(params)

  const posts = useMemo(() => (data ? data.pages.flatMap((p) => p.items) : []), [data])
  const total = data?.pages[0]?.total ?? 0

  const submitSearch = () => {
    setTab('new')
    setQ(qInput.trim())
  }

  // 无限滚动哨兵
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasNextPage) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '600px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <CommunityShell>
      <PageContainer className="py-10 lg:py-14">
        {/* ── Hero ── */}
        <header className="mb-8 lg:mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-500 ring-1 ring-sky-100 backdrop-blur">
            <Sparkles size={12} /> FlightWoodX 社区
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black/90 lg:text-4xl">作品广场</h1>
          <p className="mt-2 max-w-xl text-black/55">
            小创客们用榫卯拼出的木质飞行器，挑一架喜欢的，点开看看，点赞、收藏，或者复用它的设计自己改造。
          </p>
        </header>

        {/* ── 控制条：搜索 + 分段标签 ── */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-400" />
            <input
              placeholder="搜索作品名…"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
              className="w-full rounded-full border border-sky-100 bg-white/80 py-2.5 pl-11 pr-4 text-sm text-black/80 shadow-soft outline-none backdrop-blur transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            {/* 排行榜入口：从顶部导航搬到这里，放在排序标签左边；与标签同一套药丸样式 */}
            <Link
              to="/community/leaderboard"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-2 text-sm font-medium text-sky-600 ring-1 ring-sky-100 backdrop-blur transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <Trophy size={15} />
              排行榜
            </Link>
            <div className="inline-flex items-center gap-0.5 rounded-full bg-white/70 p-1 ring-1 ring-sky-100 backdrop-blur">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    tab === t.key ? 'bg-sky-500 text-white shadow-soft' : 'text-black/45 hover:text-black/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 三态 ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 sm:gap-5 xl:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.05]">
                <div className="aspect-[4/3] animate-pulse bg-paper-100" />
                <div className="space-y-2 p-3.5">
                  <div className="h-3.5 w-2/3 animate-pulse rounded bg-paper-100" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-paper-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-white/50 py-20 text-center">
            <p className="text-black/55">作品墙加载失败了</p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sky-600"
            >
              重试
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-sky-200 bg-white/50 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
              <ImageOff size={24} className="text-sky-300" />
            </div>
            <p className="text-black/55">
              {active.mode === 'new' && q
                ? `没有找到与「${q}」相关的作品`
                : active.mode === 'trending'
                  ? '这个榜单还没有上榜作品，先去点赞支持喜欢的作品吧！'
                  : '社区还没有作品，去把你的作品发布到社区吧！'}
            </p>
          </div>
        ) : (
          <>
            <MasonryGrid posts={posts} animateKey={`${tab}|${q}`} />
            <div ref={sentinelRef} className="h-8" aria-hidden="true" />
            {isFetchingNextPage && (
              <p className="flex items-center justify-center gap-2 pb-2 pt-4 text-sm text-black/45">
                <Loader2 size={15} className="animate-spin" /> 加载更多…
              </p>
            )}
            {!hasNextPage && <p className="pb-2 pt-8 text-center text-sm text-black/40">· 共 {total} 件作品 ·</p>}
          </>
        )}
      </PageContainer>
    </CommunityShell>
  )
}
