import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderPlus, ImageOff, Lock, Plus } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { Modal } from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useCreateCollection, useMyCollections, type CollectionDTO } from '../../hooks/useCollections'

export function CollectionsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const { data: collections, isLoading, isError, refetch } = useMyCollections(isLoggedIn)
  const createCollection = useCreateCollection()

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const resetForm = () => {
    setName('')
    setDescription('')
    setIsPublic(true)
  }

  const submit = () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.push('warning', '请先给合集起个名字')
      return
    }
    createCollection.mutate(
      { name: trimmed, description: description.trim() || undefined, isPublic },
      {
        onSuccess: (created) => {
          toast.push('success', '合集已创建')
          setModalOpen(false)
          resetForm()
          nav(`/collections/${created.id}`)
        },
        onError: (err) => toast.push('error', err instanceof Error ? err.message : '创建合集失败'),
      },
    )
  }

  // 未登录：友好引导
  if (!isLoggedIn) {
    return (
      <PageContainer className="py-8 space-y-6">
        <PageHeader title="我的收藏" description="把喜欢的作品收进合集，随时回来看" />
        <div className="py-20 text-center">
          <FolderPlus size={40} className="mx-auto text-sky-300" />
          <p className="mt-4 text-ink-500">登录后即可创建合集、收藏喜欢的作品</p>
          <Button className="mt-4" onClick={() => nav('/login')}>去登录</Button>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader
        title="我的收藏"
        description="把喜欢的作品收进合集，像收藏夹一样整理"
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            新建合集
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-white ring-1 ring-sky-100 overflow-hidden">
              <div className="aspect-[4/3] bg-sky-50 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-2/3 bg-sky-50 rounded animate-pulse" />
                <div className="h-3 w-1/3 bg-sky-50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="py-16 text-center">
          <p className="text-ink-400">加载合集失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>重试</Button>
        </div>
      ) : !collections || collections.length === 0 ? (
        <div className="py-16 text-center">
          <FolderPlus size={40} className="mx-auto text-sky-300" />
          <p className="mt-4 text-ink-500">你还没有合集，新建一个开始收藏吧</p>
          <Button className="mt-4" leftIcon={<Plus size={16} />} onClick={() => setModalOpen(true)}>
            新建合集
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {collections.map((c: CollectionDTO) => (
            <Card
              key={c.id}
              className="group cursor-pointer overflow-hidden"
              onClick={() => nav(`/collections/${c.id}`)}
            >
              <div className="aspect-[4/3] overflow-hidden rounded-t-lg bg-sky-50 -mx-4 -mt-4 mb-4 flex items-center justify-center">
                {c.coverUrl ? (
                  <img
                    src={c.coverUrl}
                    alt={c.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                    loading="lazy"
                  />
                ) : (
                  <ImageOff size={28} className="text-sky-200" />
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-ink-900 truncate">{c.name}</h3>
                {!c.isPublic && <Lock size={13} className="shrink-0 text-ink-400" aria-label="私密合集" />}
              </div>
              <p className="text-sm text-ink-400 mt-0.5">{c.itemCount} 个作品</p>
            </Card>
          ))}
        </div>
      )}

      {/* 新建合集弹窗 */}
      <Modal
        open={modalOpen}
        title="新建合集"
        onClose={() => {
          setModalOpen(false)
          resetForm()
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setModalOpen(false)
                resetForm()
              }}
            >
              取消
            </Button>
            <Button size="sm" loading={createCollection.isPending} onClick={submit}>
              创建
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="合集名称"
            placeholder="例如：我最喜欢的飞机"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <Input
            label="描述（可选）"
            placeholder="一句话说说这个合集"
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
