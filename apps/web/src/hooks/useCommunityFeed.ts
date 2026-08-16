import { useInfiniteQuery } from '@tanstack/react-query'
import { apiFetch } from '../utils/api'

/** 热门榜时间窗（对齐 @fwx/shared TrendingQuery.window）。 */
export type TrendingWindow = 'day' | 'week' | 'all'

/** 信息流模式：最新 | 热门。 */
export type FeedMode = 'new' | 'trending'

/**
 * 瀑布流卡片视图 DTO（前端本地视图类型）。
 * 字段对齐集成清单 §8 PostCard——/posts 与 /trending 每项返回同一形状。
 */
export interface PostCard {
  id: string
  authorId: string
  author: { id: string; username: string; avatar?: string } | null
  projectId: string
  title: string
  coverUrl?: string
  likeCount: number
  favoriteCount: number
  likedByMe: boolean
  createdAt: string
}

/** 后端分页响应（Paginated<PostCard>）。 */
interface FeedPage {
  items: PostCard[]
  total: number
  page: number
  pageSize: number
}

export interface CommunityFeedParams {
  mode: FeedMode
  /** 仅 trending 用；new 模式忽略。 */
  window?: TrendingWindow
  /** 仅 new 模式用的搜索词。 */
  q?: string
}

async function fetchFeedPage(params: CommunityFeedParams, page: number): Promise<FeedPage> {
  const qs = new URLSearchParams()
  qs.set('page', String(page))
  let endpoint: string
  if (params.mode === 'trending') {
    qs.set('window', params.window ?? 'all')
    endpoint = `/community/trending?${qs.toString()}`
  } else {
    qs.set('sort', 'new')
    if (params.q) qs.set('q', params.q)
    endpoint = `/community/posts?${qs.toString()}`
  }
  const res = await apiFetch<FeedPage>(endpoint)
  if (!res.success || !res.data) throw new Error(res.error || '获取社区作品失败')
  return res.data
}

/**
 * 社区信息流（瀑布流）无限滚动。
 * mode='new' → GET /posts?sort=new；mode='trending' → GET /trending?window=。
 * 下一页：当 page*pageSize < total 时存在。
 */
export function useCommunityFeed(params: CommunityFeedParams) {
  return useInfiniteQuery({
    queryKey: ['community', 'infinite', { mode: params.mode, window: params.window, q: params.q }],
    queryFn: ({ pageParam }) => fetchFeedPage(params, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  })
}
