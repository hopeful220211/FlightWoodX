import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ImageOff, Images, Lock, Pencil, Settings2, Trash2, X } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Modal } from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { CommunityShell } from '../../components/features/community/CommunityShell'
import { MasonryGrid } from '../../components/features/community/MasonryGrid'
import {
  useCollection,
  useDeleteCollection,
  useRemoveFromCollection,
  useUpdateCollection,
  type PostCard,
} from '../../hooks/useCollections'

const EASE = 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]'

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
  // 管理模式：开启后每张卡片露出「移除」控件
  const [manage, setManage] = useState(false)

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
    <CommunityShell>
      <PageContainer className="py-8 lg:py-10">
        <Breadcrumb
          items={[
            { label: '我的收藏', to: '/collections' },
            { label: collection ? collection.name : '合集' },
          ]}
        />

        {isLoading ? (
          <div className="mt-6 space-y-8">
            <div className="space-y-3">
              <div className="h-9 w-1/3 animate-pulse rounded bg-sky-50" />
              <div className="h-4 w-2/5 animate-pulse rounded bg-sky-50" />
            </div>
            <div className="flex gap-5">
              {Array.from({ length: 4 }).map((_, c) => (
                <div key={c} className="flex flex-1 flex-col gap-5">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.04]">
                      <div className="aspect-[4/5] animate-pulse bg-paper-100" />
                      <div className="space-y-2 p-4">
                        <div className="h-4 w-2/3 animate-pulse rounded bg-paper-100" />
                        <div className="h-3 w-1/3 animate-pulse rounded bg-paper-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : isError || !collection ? (
          <div className="mt-6 rounded-2xl border border-dashed border-sky-200 bg-white/50 py-20 text-center">
            <p className="text-black/55">合集不存在或加载失败</p>
            <button
              onClick={() => refetch()}
              className="mt-3 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sky-600"
            >
              重试
            </button>
          </div>
        ) : (
          <>
            {/* 头部 */}
            <header className="mt-6 flex flex-wrap items-end justify-between gap-4 lg:mt-8">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="fwx-display truncate text-4xl font-semibold tracking-tight text-black/90 lg:text-5xl">
                    {collection.name}
                  </h1>
                  {!collection.isPublic && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-black/55 ring-1 ring-sky-100 backdrop-blur">
                      <Lock size={12} /> 私密
                    </span>
                  )}
                </div>
                {collection.description && (
                  <p className="mt-3 max-w-2xl text-black/55">{collection.description}</p>
                )}
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-black/45">
                  <Images size={14} /> {collection.items.length} 件作品
                </p>
              </div>
              {isOwner && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  {collection.items.length > 0 && (
                    <button
                      onClick={() => setManage((m) => !m)}
                      aria-pressed={manage}
                      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold shadow-soft transition-all ${EASE} ${
                        manage
                          ? 'bg-sky-500 text-white shadow-sky-glow hover:bg-sky-600'
                          : 'border border-sky-200 bg-white text-black/75 hover:border-sky-300 hover:bg-sky-50'
                      }`}
                    >
                      <Settings2 size={15} /> {manage ? '完成' : '管理'}
                    </button>
                  )}
                  <button
                    onClick={openEdit}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-black/75 shadow-soft transition-all hover:border-sky-300 hover:bg-sky-50 ${EASE}`}
                  >
                    <Pencil size={14} /> 编辑
                  </button>
                  <button
                    onClick={onDelete}
                    disabled={deleteCollection.isPending}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-white px-4 py-2 text-sm font-semibold text-black/75 shadow-soft transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 ${EASE}`}
                  >
                    <Trash2 size={14} /> {deleteCollection.isPending ? '删除中…' : '删除'}
                  </button>
                </div>
              )}
            </header>

            {/* 条目区 */}
            <div className="mt-8">
              {collection.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-sky-200 bg-white/50 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
                    <ImageOff size={24} className="text-sky-300" />
                  </div>
                  <p className="text-black/55">这个合集还没有作品</p>
                  <button
                    onClick={() => nav('/community')}
                    className={`mt-4 inline-flex items-center rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sky-glow transition-all hover:bg-sky-600 ${EASE}`}
                  >
                    去社区收藏
                  </button>
                </div>
              ) : manage && isOwner ? (
                <ManageGrid
                  items={collection.items}
                  pendingId={removeItem.isPending ? removeItem.variables?.postId : undefined}
                  onRemove={onRemoveItem}
                />
              ) : (
                <MasonryGrid posts={collection.items} animateKey={collection.id} />
              )}
            </div>
          </>
        )}

        {/* 编辑合集弹窗 */}
        <Modal
          open={editOpen}
          title="编辑合集"
          onClose={() => setEditOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                取消
              </Button>
              <Button size="sm" loading={updateCollection.isPending} onClick={submitEdit}>
                保存
              </Button>
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
            <label className="flex items-center gap-2 text-sm text-black/75 select-none">
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
    </CommunityShell>
  )
}

/**
 * 管理模式网格：与瀑布流卡片同源的天蓝风格，但每张卡突出「移除」控件。
 * WorkCard 不承载移除按钮，故管理态用本网格替换，保持浏览态干净、管理态明确。
 */
function ManageGrid({
  items,
  pendingId,
  onRemove,
}: {
  items: PostCard[]
  pendingId?: string
  onRemove: (post: PostCard) => void
}) {
  return (
    <>
      <p className="mb-4 text-sm text-black/45">管理模式：点右上角 ✕ 把作品移出合集，完成后点「完成」。</p>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((post) => {
          const pending = pendingId === post.id
          return (
            <article
              key={post.id}
              className={`group relative overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-sky-100 transition-all ${EASE} ${
                pending ? 'opacity-50' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onRemove(post)}
                disabled={pending}
                aria-label="从合集移除"
                title="从合集移除"
                className="absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-black/55 shadow-soft backdrop-blur-md transition-all hover:bg-rose-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed"
              >
                <X size={15} />
              </button>
              <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-sky-50 to-sky-100/40">
                {post.coverUrl ? (
                  <img
                    src={post.coverUrl}
                    alt={post.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageOff size={24} className="text-sky-200" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="truncate font-semibold text-black/90">{post.title}</h3>
                <p className="mt-1 truncate text-sm text-black/45">{post.author?.username || '匿名'}</p>
              </div>
            </article>
          )
        })}
      </div>
    </>
  )
}
