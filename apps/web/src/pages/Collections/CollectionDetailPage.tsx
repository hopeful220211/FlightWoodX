import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Heart, ImageOff, Lock, Pencil, Trash2, X } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Modal } from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import {
  useCollection,
  useDeleteCollection,
  useRemoveFromCollection,
  useUpdateCollection,
  type PostCard,
} from '../../hooks/useCollections'

export function CollectionDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const myUserId = useAuthStore((s) => s.user?.id)

  const { data: collection, isLoading, isError, refetch } = useCollection(id)
  const updateCollection = useUpdateCollection()
  const deleteCollection = useDeleteCollection()
  const removeItem = useRemoveFromCollection()

  const isOwner = !!collection && !!myUserId && collection.ownerId === myUserId

  // 编辑弹窗本地态
  const [editOpen, setEditOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  // 打开编辑弹窗时用当前合集数据回填（在事件处理里同步赋值，避免 effect 内 setState 的级联渲染）
  const openEdit = () => {
    if (!collection) return
    setName(collection.name)
    setDescription(collection.description || '')
    setIsPublic(collection.isPublic)
    setEditOpen(true)
  }

  const submitEdit = () => {
    if (!collection) return
    const trimmed = name.trim()
    if (!trimmed) {
      toast.push('warning', '合集名称不能为空')
      return
    }
    updateCollection.mutate(
      { id: collection.id, name: trimmed, description: description.trim(), isPublic },
      {
        onSuccess: () => {
          toast.push('success', '已保存')
          setEditOpen(false)
        },
        onError: (err) => toast.push('error', err instanceof Error ? err.message : '保存失败'),
      },
    )
  }

  const onDelete = () => {
    if (!collection) return
    if (!window.confirm(`确定删除合集「${collection.name}」吗？合集里的作品不会被删除。`)) return
    deleteCollection.mutate(collection.id, {
      onSuccess: () => {
        toast.push('success', '合集已删除')
        nav('/collections')
      },
      onError: (err) => toast.push('error', err instanceof Error ? err.message : '删除失败'),
    })
  }

  const onRemoveItem = (post: PostCard) => {
    if (!collection) return
    removeItem.mutate(
      { collectionId: collection.id, postId: post.id },
      {
        onSuccess: () => toast.push('success', '已移出合集'),
        onError: (err) => toast.push('error', err instanceof Error ? err.message : '移出失败'),
      },
    )
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: '我的收藏', to: '/collections' },
          { label: collection ? collection.name : '合集' },
        ]}
      />

      {isLoading ? (
        <div className="space-y-6">
          <div className="h-8 w-1/3 rounded bg-sky-50 animate-pulse" />
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mb-5 break-inside-avoid rounded-lg bg-white ring-1 ring-sky-100 overflow-hidden">
                <div className="aspect-[4/3] bg-sky-50 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-2/3 bg-sky-50 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isError || !collection ? (
        <div className="py-16 text-center">
          <p className="text-ink-400">合集不存在或加载失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>重试</Button>
        </div>
      ) : (
        <>
          {/* 头部 */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-ink-900 truncate">{collection.name}</h1>
                {!collection.isPublic && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-xs text-ink-500">
                    <Lock size={12} /> 私密
                  </span>
                )}
              </div>
              {collection.description && (
                <p className="mt-1 text-ink-600">{collection.description}</p>
              )}
              <p className="mt-1 text-sm text-ink-400">{collection.items.length} 个作品</p>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" leftIcon={<Pencil size={14} />} onClick={openEdit}>
                  编辑
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Trash2 size={14} />}
                  loading={deleteCollection.isPending}
                  onClick={onDelete}
                >
                  删除
                </Button>
              </div>
            )}
          </div>

          {/* 条目瀑布流 */}
          {collection.items.length === 0 ? (
            <div className="py-16 text-center text-ink-400">这个合集还没有作品</div>
          ) : (
            <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 xl:columns-4">
              {collection.items.map((post) => (
                <Card
                  key={post.id}
                  className="group relative mb-5 break-inside-avoid cursor-pointer overflow-hidden"
                  onClick={() => nav(`/community/${post.id}`)}
                >
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveItem(post)
                      }}
                      className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink-500 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 hover:text-rose-500"
                      aria-label="从合集移除"
                      title="从合集移除"
                    >
                      <X size={15} />
                    </button>
                  )}
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
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-sm text-ink-400 truncate">{post.author?.username || '匿名'}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-ink-400">
                      <Heart size={12} fill={post.likedByMe ? 'currentColor' : 'none'} className={post.likedByMe ? 'text-rose-500' : ''} />
                      {post.likeCount}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* 编辑合集弹窗 */}
      <Modal
        open={editOpen}
        title="编辑合集"
        onClose={() => setEditOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>取消</Button>
            <Button size="sm" loading={updateCollection.isPending} onClick={submitEdit}>保存</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="合集名称"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitEdit()}
          />
          <Input
            label="描述（可选）"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-ink-700 select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-sky-300 text-sky-500 focus:ring-sky-400"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            公开这个合集（其他人也能看到）
          </label>
        </div>
      </Modal>
    </PageContainer>
  )
}
