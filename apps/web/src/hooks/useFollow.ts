import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query'
import { apiFetch } from '../utils/api'

/** 创作者公开信息（绝不含 grade/studentId/email）。 */
export interface AuthorDTO {
  id: string
  username: string
  avatar?: string
  followerCount: number
  followingCount: number
  isFollowedByMe: boolean
}

/** 列表卡片（与社区瀑布流同口径 PostCard）。 */
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
export interface PostPage {
  items: PostCard[]
  total: number
  page: number
  pageSize: number
}

/** GET /users/:id 返回体：作者 + 其作品分页。 */
export interface AuthorResponse {
  author: AuthorDTO
  posts: PostPage
}

const authorKey = (userId: string) => ['author', userId] as const
const FEED_KEY = ['community', 'feed'] as const

/**
 * 创作者主页（公域，游客也拉）—— 无限分页。
 * 每页返回 { author, posts }；作者信息每页都带回最新计数，作品按页累积。
 * queryKey 用 ['author', userId]，与乐观更新 / 失效保持同一前缀。
 */
export function useAuthor(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: authorKey(userId ?? ''),
    queryFn: async ({ pageParam }): Promise<AuthorResponse> => {
      const res = await apiFetch<AuthorResponse>(`/community/users/${userId}?page=${pageParam}`)
      if (!res.success || !res.data) throw new Error(res.error || '获取创作者主页失败')
      return res.data
    },
    enabled: !!userId,
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.posts.page * lastPage.posts.pageSize < lastPage.posts.total
        ? lastPage.posts.page + 1
        : undefined,
  })
}

/**
 * 关注 / 取消关注（乐观更新）。
 * 入参 followed = 当前是否已关注；据此调 DELETE/POST。
 * 乐观：立即翻转 ['author', userId] 各分页缓存的 isFollowedByMe，并 followerCount±1；失败回滚。
 */
export function useToggleFollow() {
  const qc = useQueryClient()

  // 作者主页是无限分页，缓存形状为 InfiniteData<AuthorResponse>；翻转每页 author 块即可。
  const patchAuthor = (userId: string, nextFollowed: boolean) => {
    const delta = nextFollowed ? 1 : -1
    qc.setQueriesData<InfiniteData<AuthorResponse>>({ queryKey: ['author', userId] }, (cur) =>
      cur
        ? {
            ...cur,
            pages: cur.pages.map((pg) => ({
              ...pg,
              author: {
                ...pg.author,
                isFollowedByMe: nextFollowed,
                followerCount: Math.max(0, pg.author.followerCount + delta),
              },
            })),
          }
        : cur,
    )
  }

  return useMutation({
    mutationFn: async ({ userId, followed }: { userId: string; followed: boolean }) => {
      const res = await apiFetch<{ isFollowedByMe: boolean }>(
        `/community/users/${userId}/follow`,
        { method: followed ? 'DELETE' : 'POST' },
      )
      if (!res.success) throw new Error(res.error || '操作失败')
      return res.data
    },
    onMutate: async ({ userId, followed }) => {
      await qc.cancelQueries({ queryKey: ['author', userId] })
      const prev = qc.getQueriesData<InfiniteData<AuthorResponse>>({ queryKey: ['author', userId] })
      patchAuthor(userId, !followed)
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.prev?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: (_data, _err, { userId }) => {
      qc.invalidateQueries({ queryKey: ['author', userId] })
      qc.invalidateQueries({ queryKey: FEED_KEY })
    },
  })
}

/** 我的关注流（瀑布流）无限滚动。GET /community/feed?page=。 */
export function useFollowingFeed() {
  return useInfiniteQuery({
    queryKey: FEED_KEY,
    queryFn: async ({ pageParam }): Promise<PostPage> => {
      const res = await apiFetch<PostPage>(`/community/feed?page=${pageParam}`)
      if (!res.success || !res.data) throw new Error(res.error || '获取关注流失败')
      return res.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
  })
}
