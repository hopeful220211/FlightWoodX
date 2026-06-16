/**
 * PublishModal — 把一个项目发布到社区（RFC-017 P0）。
 *
 * 流程：填标题/描述 → 发布。后端强校验「项目属本人且 visibility=public」，
 * 若项目仍为私密，后端拒绝，本弹窗给出「公开项目并发布」二次确认按钮
 * （会改 Project.visibility=public，文案点明该副作用），不在前端绕过校验。
 * 发布幂等：同一项目重复发布返回既有作品。
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../../common/Modal'
import { Button } from '../../common/Button'
import { Input } from '../../common/Input'
import { useToast } from '../../common/Toast'
import { createCommunityPost, updateProject } from '../../../utils/api'

interface PublishModalProps {
  open: boolean
  onClose: () => void
  projectId: string
  defaultTitle?: string
}

export function PublishModal({ open, onClose, projectId, defaultTitle }: PublishModalProps) {
  const nav = useNavigate()
  const toast = useToast()
  const [title, setTitle] = useState(defaultTitle || '')
  const [description, setDescription] = useState('')
  const [needPublic, setNeedPublic] = useState(false)
  const [busy, setBusy] = useState(false)

  const doPublish = async () => {
    const res = await createCommunityPost({ projectId, title: title.trim() || undefined, description: description.trim() || undefined })
    if (res.success && res.data) {
      toast.push('success', res.data.alreadyPublished ? '该作品已在社区，已为你打开' : '已发布到社区！')
      onClose()
      nav(`/community/${res.data.post.id}`)
      return
    }
    // 项目还是私密 → 引导公开
    if ((res.error || '').includes('公开')) {
      setNeedPublic(true)
      return
    }
    toast.push('error', res.error || '发布失败')
  }

  const handlePublish = async () => {
    setBusy(true)
    try {
      await doPublish()
    } finally {
      setBusy(false)
    }
  }

  const handlePublicAndPublish = async () => {
    setBusy(true)
    try {
      const up = await updateProject(projectId, { visibility: 'public' })
      if (!up.success) {
        toast.push('error', up.error || '公开项目失败')
        return
      }
      setNeedPublic(false)
      await doPublish()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="发布到社区">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">作品标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="给你的作品起个名字" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-700">作品介绍（可选）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="说说你的设计思路、亮点……"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-ink-900 outline-none focus:border-sky-400"
          />
        </div>

        {needPublic ? (
          <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="text-sm text-amber-700">这个项目目前是<strong>私密</strong>的。发布到社区会让它<strong>公开可见</strong>。</p>
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={onClose} disabled={busy}>再想想</Button>
              <Button size="sm" onClick={handlePublicAndPublish} disabled={busy}>公开项目并发布</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>取消</Button>
            <Button onClick={handlePublish} disabled={busy}>{busy ? '发布中…' : '发布'}</Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
