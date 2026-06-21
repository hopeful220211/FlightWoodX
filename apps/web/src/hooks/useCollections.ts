import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../utils/api'

// ===== 展示 DTO（前端本地组合；社交原语契约来自 @fwx/shared，不在此重定义）=====

/** 合集详情条目卡片，形状对齐集成清单 §8 PostCard */
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

/** 合集卡片（列表用，不含条目） */
export interface CollectionDTO {
  id: string
  name: string
  description?: string
  coverUrl?: string
  itemCount: number
  isPublic: boolean
  createdAt: string
}

/** 合集详情 = 合集卡片 + 拥有者 + 条目列表 */
export interface CollectionDetail extends CollectionDTO {
  ownerId: string
  items: PostCard[]
}

const COLLECTIONS_KEY = ['collections'] as const
const collectionKey = (id: string) => ['collection', id] as const
const membershipKey = (postId: string) => ['collectionMemberships', postId] as const

// ===== API 调用（用通用 apiFetch；后端 { collection } / { items } 包裹在此解包）=====

async function fetchMyCollections(): Promise<CollectionDTO[]> {
  const res = await apiFetch<{ items: CollectionDTO[] }>('/community/collections')
  if (!res.success || !res.data) throw new Error(res.error || '获取合集失败')
  // apiFetch 已把 { items } 透传为 data；统一取 items（兼容直接数组）
  const data = res.data as unknown as { items?: CollectionDTO[] }
  return data.items ?? (res.data as unknown as CollectionDTO[])
}

async function fetchCollection(id: string): Promise<CollectionDetail> {
  const res = await apiFetch<{ collection: CollectionDetail }>(`/community/collections/${id}`)
  if (!res.success || !res.data) throw new Error(res.error || '获取合集详情失败')
  const data = res.data as unknown as { collection?: CollectionDetail }
  return (data.collection ?? (res.data as unknown as CollectionDetail))
}

/** 我的合集列表（需登录） */
export function useMyCollections(enabled = true) {
  return useQuery({
    queryKey: COLLECTIONS_KEY,
    queryFn: fetchMyCollections,
    enabled,
  })
}

/** 单个合集详情 */
export function useCollection(id: string | undefined) {
  return useQuery({
    queryKey: collectionKey(id || ''),
    queryFn: () => fetchCollection(id!),
    enabled: !!id,
  })
}

/** 新建合集 */
export function useCreateCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; isPublic?: boolean }) => {
      const res = await apiFetch<{ collection: CollectionDTO }>('/community/collections', {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.success || !res.data) throw new Error(res.error || '创建合集失败')
      const data = res.data as unknown as { collection?: CollectionDTO }
      return data.collection ?? (res.data as unknown as CollectionDTO)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY })
    },
  })
}

/** 更新合集（名称 / 描述 / 公开 / 封面） */
export function useUpdateCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      description?: string
      isPublic?: boolean
      coverPostId?: string | null
    }) => {
      const { id, ...body } = input
      const res = await apiFetch<{ collection: CollectionDTO }>(`/community/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.success || !res.data) throw new Error(res.error || '更新合集失败')
      const data = res.data as unknown as { collection?: CollectionDTO }
      return data.collection ?? (res.data as unknown as CollectionDTO)
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY })
      qc.invalidateQueries({ queryKey: collectionKey(id) })
    },
  })
}

/** 删除合集 */
export function useDeleteCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/community/collections/${id}`, { method: 'DELETE' })
      if (!res.success) throw new Error(res.error || '删除合集失败')
      return id
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY })
      qc.removeQueries({ queryKey: collectionKey(id) })
    },
  })
}

/** 把作品加入合集（幂等） */
export function useAddToCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ collectionId, postId }: { collectionId: string; postId: string }) => {
      const res = await apiFetch(`/community/collections/${collectionId}/items`, {
        method: 'POST',
        body: JSON.stringify({ postId }),
      })
      if (!res.success) throw new Error(res.error || '加入合集失败')
      return { collectionId, postId }
    },
    onSuccess: ({ collectionId, postId }) => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY })
      qc.invalidateQueries({ queryKey: collectionKey(collectionId) })
      qc.invalidateQueries({ queryKey: membershipKey(postId) })
    },
  })
}

/** 从合集移除作品（幂等） */
export function useRemoveFromCollection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ collectionId, postId }: { collectionId: string; postId: string }) => {
      const res = await apiFetch(`/community/collections/${collectionId}/items/${postId}`, {
        method: 'DELETE',
      })
      if (!res.success) throw new Error(res.error || '移出合集失败')
      return { collectionId, postId }
    },
    onSuccess: ({ collectionId, postId }) => {
      qc.invalidateQueries({ queryKey: COLLECTIONS_KEY })
      qc.invalidateQueries({ queryKey: collectionKey(collectionId) })
      qc.invalidateQueries({ queryKey: membershipKey(postId) })
    },
  })
}

/**
 * 我的哪些合集已包含某作品（用于「收藏到合集」弹窗回填勾选态）。
 * 仅在 enabled 时拉取（典型：弹窗打开 + 已登录）。
 */
export function useCollectionMemberships(postId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: membershipKey(postId || ''),
    queryFn: async (): Promise<string[]> => {
      const res = await apiFetch<{ collectionIds: string[] }>(
        `/community/collections/memberships?postId=${postId}`,
      )
      if (!res.success || !res.data) throw new Error(res.error || '获取收藏状态失败')
      const data = res.data as unknown as { collectionIds?: string[] }
      return data.collectionIds ?? []
    },
    enabled: !!postId && enabled,
  })
}
