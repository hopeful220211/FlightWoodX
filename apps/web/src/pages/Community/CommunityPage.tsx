import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Search, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useCommunityPosts, useToggleLike } from '../../hooks/useCommunity'
import type { CommunityPostCard } from '../../utils/api'

const PAGE_SIZE = 12

export function CommunityPage() {
  const nav = useNavigate()
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'new' | 'hot'>('new')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError, refetch, isFetching } = useCommunityPosts({ page, pageSize: PAGE_SIZE, sort, q })
  const toggleLike = useToggleLike()

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  const submitSearch = () => {
    setPage(1)
    setQ(qInput.trim())
  }

  const onLike = (post: CommunityPostCard) => {
    if (!isLoggedIn) {
      toast.push('info', '登录后才能点赞哦')
      return
    }
    toggleLike.mutate({ id: post.id, liked: post.likedByMe })
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader title="社区作品库" />

      {/* 搜索 + 排序 */}
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
        <div className="flex items-center gap-1 border-b border-gray-100">
          {([['new', '最新'], ['hot', '最热']] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => { setSort(key); setPage(1) }}
              className={`px-3 py-2 text-sm transition-colors ${
                sort === key
                  ? 'text-sky-600 font-semibold border-b-2 border-sky-500 -mb-px'
                  : 'text-ink-400 hover:text-ink-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 三态 */}
      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-white ring-1 ring-gray-100 overflow-hidden">
              <div className="aspect-[4/3] bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-16 text-center">
          <p className="text-ink-400">加载社区作品失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>重试</Button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="py-16 text-center text-ink-400">
          {q ? `没有找到与「${q}」相关的作品` : '社区还没有作品，去把你的作品发布到社区吧！'}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <Card key={post.id} className="group cursor-pointer overflow-hidden" onClick={() => nav(`/community/${post.id}`)}>
                <div className="aspect-[4/3] overflow-hidden rounded-t-xl bg-sky-50 -mx-4 -mt-4 mb-4 flex items-center justify-center">
                  {post.coverUrl ? (
                    <img
                      src={post.coverUrl}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <ImageOff size={28} className="text-sky-200" />
                  )}
                </div>
                <h3 className="font-semibold text-ink-900 truncate">{post.title}</h3>
                <p className="text-sm text-ink-400 mt-0.5">{post.author?.username || '匿名'}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onLike(post) }}
                    className={`inline-flex items-center gap-1 transition-colors ${
                      post.likedByMe ? 'text-rose-500' : 'hover:text-rose-400'
                    }`}
                    aria-pressed={post.likedByMe}
                  >
                    <Heart size={13} fill={post.likedByMe ? 'currentColor' : 'none'} />
                    {post.likeCount}
                  </button>
                </div>
              </Card>
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))} leftIcon={<ChevronLeft size={14} />}>
                上一页
              </Button>
              <span className="text-sm text-ink-400">第 {page} / {totalPages} 页</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages || isFetching} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} rightIcon={<ChevronRight size={14} />}>
                下一页
              </Button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
