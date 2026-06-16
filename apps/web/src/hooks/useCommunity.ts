import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCommunityPosts,
  getCommunityPost,
  likeCommunityPost,
  unlikeCommunityPost,
  type CommunityListQuery,
  type CommunityListResult,
  type CommunityPostCard,
  type CommunityPostDetail,
} from '../utils/api'

const POSTS_KEY = ['community', 'posts'] as const
const postKey = (id: string) => ['community', 'post', id] as const

/** 社区作品分页列表（公域，游客也拉） */
export function useCommunityPosts(query: CommunityListQuery) {
  return useQuery({
    queryKey: [...POSTS_KEY, query],
    queryFn: async (): Promise<CommunityListResult> => {
      const res = await getCommunityPosts(query)
      if (!res.success || !res.data) throw new Error(res.error || '获取社区作品失败')
      return res.data
    },
  })
}

/** 社区作品详情 */
export function useCommunityPost(id: string | undefined) {
  return useQuery({
    queryKey: postKey(id || ''),
    queryFn: async (): Promise<CommunityPostDetail> => {
      const res = await getCommunityPost(id!)
      if (!res.success || !res.data) throw new Error(res.error || '获取作品详情失败')
      return res.data
    },
    enabled: !!id,
  })
}

/**
 * 点赞 / 取消点赞（乐观更新）。
 * 入参 liked = 当前是否已赞；据此调 unlike/like。
 * 乐观：立即翻 likedByMe 并 likeCount±1，同步更新「详情缓存」与所有「列表缓存」；失败回滚。
 */
export function useToggleLike() {
  const qc = useQueryClient()

  const applyDelta = (id: string, nextLiked: boolean) => {
    const delta = nextLiked ? 1 : -1
    // 详情缓存
    qc.setQueryData<CommunityPostDetail>(postKey(id), (d) =>
      d ? { ...d, likedByMe: nextLiked, likeCount: Math.max(0, d.likeCount + delta) } : d,
    )
    // 所有列表缓存（不同 query 参数）
    qc.setQueriesData<CommunityListResult>({ queryKey: POSTS_KEY }, (list) =>
      list
        ? {
            ...list,
            items: list.items.map((it: CommunityPostCard) =>
              it.id === id ? { ...it, likedByMe: nextLiked, likeCount: Math.max(0, it.likeCount + delta) } : it,
            ),
          }
        : list,
    )
  }

  return useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      const res = liked ? await unlikeCommunityPost(id) : await likeCommunityPost(id)
      if (!res.success) throw new Error(res.error || '操作失败')
      return res.data
    },
    onMutate: async ({ id, liked }) => {
      await qc.cancelQueries({ queryKey: postKey(id) })
      await qc.cancelQueries({ queryKey: POSTS_KEY })
      const prevDetail = qc.getQueryData<CommunityPostDetail>(postKey(id))
      const prevLists = qc.getQueriesData<CommunityListResult>({ queryKey: POSTS_KEY })
      applyDelta(id, !liked)
      return { prevDetail, prevLists, id }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      if (ctx.prevDetail) qc.setQueryData(postKey(ctx.id), ctx.prevDetail)
      ctx.prevLists?.forEach(([key, data]) => qc.setQueryData(key, data))
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: postKey(id) })
      qc.invalidateQueries({ queryKey: POSTS_KEY })
    },
  })
}
