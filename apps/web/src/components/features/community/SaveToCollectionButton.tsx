import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Check, Loader2, Plus } from 'lucide-react'
import { Button } from '../../common/Button'
import { Input } from '../../common/Input'
import { Modal } from '../../common/Modal'
import { useToast } from '../../common/Toast'
import { useAuthStore } from '../../../stores/authStore'
import {
  useAddToCollection,
  useCollectionMemberships,
  useCreateCollection,
  useMyCollections,
  useRemoveFromCollection,
} from '../../../hooks/useCollections'

export interface SaveToCollectionButtonProps {
  postId: string
}

/**
 * 「收藏」按钮：点击后（登录态）弹出我的合集清单，每个合集一个复选框；
 * 勾选 = 该合集已含此作品，切换即加入 / 移出（幂等）。底部内联「＋ 新建合集」（建完即加入）。
 */
export function SaveToCollectionButton({ postId }: SaveToCollectionButtonProps) {
  const nav = useNavigate()
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const { data: collections, isLoading: loadingCollections } = useMyCollections(open && isLoggedIn)
  const { data: memberIds, isLoading: loadingMembers } = useCollectionMemberships(postId, open && isLoggedIn)

  const addToCollection = useAddToCollection()
  const removeFromCollection = useRemoveFromCollection()
  const createCollection = useCreateCollection()

  const memberSet = useMemo(() => new Set(memberIds ?? []), [memberIds])
  const savedCount = memberSet.size

  const openPopover = () => {
    if (!isLoggedIn) {
      toast.push('info', '登录后才能收藏哦')
      return
    }
    setOpen(true)
  }

  const toggle = (collectionId: string, contained: boolean) => {
    if (contained) {
      removeFromCollection.mutate(
        { collectionId, postId },
        { onError: (err) => toast.push('error', err instanceof Error ? err.message : '移出失败') },
      )
    } else {
      addToCollection.mutate(
        { collectionId, postId },
        {
          onSuccess: () => toast.push('success', '已收藏'),
          onError: (err) => toast.push('error', err instanceof Error ? err.message : '收藏失败'),
        },
      )
    }
  }

  const submitCreate = () => {
    const trimmed = newName.trim()
    if (!trimmed) {
      toast.push('warning', '请先给合集起个名字')
      return
    }
    createCollection.mutate(
      { name: trimmed },
      {
        onSuccess: (created) => {
          // 建完立即把当前作品加入新合集
          addToCollection.mutate(
            { collectionId: created.id, postId },
            {
              onSuccess: () => toast.push('success', '已创建并收藏'),
              onError: (err) => toast.push('error', err instanceof Error ? err.message : '收藏失败'),
            },
          )
          setCreating(false)
          setNewName('')
        },
        onError: (err) => toast.push('error', err instanceof Error ? err.message : '创建合集失败'),
      },
    )
  }

  const closeModal = () => {
    setOpen(false)
    setCreating(false)
    setNewName('')
  }

  const loading = loadingCollections || loadingMembers
  const isSaved = savedCount > 0

  return (
    <>
      <Button
        size="sm"
        variant={isSaved ? 'primary' : 'outline'}
        leftIcon={<Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />}
        onClick={openPopover}
        aria-pressed={isSaved}
      >
        {isSaved ? `已收藏${savedCount > 1 ? ` · ${savedCount}` : ''}` : '收藏'}
      </Button>

      <Modal open={open} title="收藏到合集" onClose={closeModal}>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-400">
              <Loader2 size={18} className="animate-spin motion-reduce:animate-none" />
            </div>
          ) : (
            <>
              {(collections ?? []).length === 0 ? (
                <p className="py-2 text-sm text-ink-400">你还没有合集，新建一个开始收藏吧。</p>
              ) : (
                <ul className="max-h-72 space-y-1 overflow-y-auto">
                  {(collections ?? []).map((c) => {
                    const contained = memberSet.has(c.id)
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => toggle(c.id, contained)}
                          className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                          aria-pressed={contained}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-ink-900">{c.name}</span>
                            <span className="block text-xs text-ink-400">{c.itemCount} 个作品</span>
                          </span>
                          <span
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              contained ? 'border-sky-500 bg-sky-500 text-white' : 'border-sky-200 text-transparent'
                            }`}
                            aria-hidden="true"
                          >
                            <Check size={13} />
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* 内联新建合集 */}
              {creating ? (
                <div className="flex items-center gap-2 border-t border-sky-100 pt-3">
                  <Input
                    placeholder="新合集名称"
                    maxLength={40}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
                    autoFocus
                  />
                  <Button size="sm" loading={createCollection.isPending} onClick={submitCreate}>
                    创建
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 border-t border-sky-100 px-3 pt-3 text-sm font-medium text-sky-600 transition-colors hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <Plus size={16} /> 新建合集
                </button>
              )}

              <div className="flex justify-between border-t border-sky-100 pt-3">
                <button
                  type="button"
                  onClick={() => nav('/collections')}
                  className="text-sm text-ink-400 transition-colors hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
                >
                  管理我的合集
                </button>
                <Button size="sm" variant="outline" onClick={closeModal}>完成</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
