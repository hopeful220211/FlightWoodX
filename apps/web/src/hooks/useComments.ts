import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../utils/api'

/** 评论对外结构（与后端 commentDTO 对齐，不含审核等内部字段）。 */
export interface CommentDTO {
  id: string
  authorId: string
  author: { id: string; username: string; avatar?: string } | null
  body: string
  createdAt: string
}

interface CommentList {
  items: CommentDTO[]
  total: number
  page: number
  pageSize: number
}

/** 举报理由固定枚举（与后端 REASONS 一一对应）。 */
export type ReportReason = '垃圾广告' | '不友善' | '涉及隐私' | '其他'

const commentsKey = (postId: string) => ['community', 'comments', postId] as const

/** 某作品的评论列表（公域，游客也拉）。 */
export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: commentsKey(postId || ''),
    queryFn: async (): Promise<CommentList> => {
      const res = await apiFetch<CommentList>(`/community/posts/${postId}/comments`)
      if (!res.success || !res.data) throw new Error(res.error || '获取评论失败')
      return res.data
    },
    enabled: !!postId,
  })
}

/** 发表评论；成功后刷新该作品评论列表。 */
export function useAddComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string): Promise<CommentDTO> => {
      const res = await apiFetch<{ comment: CommentDTO }>(`/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      if (!res.success || !res.data) throw new Error(res.error || '评论失败')
      return res.data.comment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(postId) })
    },
  })
}

/** 删除自己的评论；成功后刷新该作品评论列表。 */
export function useDeleteComment(postId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string): Promise<void> => {
      const res = await apiFetch(`/community/comments/${commentId}`, { method: 'DELETE' })
      if (!res.success) throw new Error(res.error || '删除失败')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commentsKey(postId) })
    },
  })
}

/** 举报评论。 */
export function useReportComment() {
  return useMutation({
    mutationFn: async ({ commentId, reason }: { commentId: string; reason: ReportReason }): Promise<void> => {
      const res = await apiFetch('/community/reports', {
        method: 'POST',
        body: JSON.stringify({ targetType: 'comment', targetId: commentId, reason }),
      })
      if (!res.success) throw new Error(res.error || '举报失败')
    },
  })
}
