// features/partStudio/PartStudioPage.tsx
//
// 自制零件工坊 容器（RFC-021 / RFC-024 §3.2 · §4.4）：左 2D 画布 + 右 3D 实时预览，并排联动。
// M2 范围：在 M1「画 → 自动封闭 → 立起来 → 3D 预览」之上，把「保存」接通、真存到服务器，
// 并在下方「我的零件」列出已存零件（刷新后仍在 = 真落库）。
// 卡扣印章、可制造性五项完整检查、并入搭建步骤在 Phase 2，本页不做。

import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import type { UserPartCategory, UserPartDTO } from '@fwx/parts-schema'
import { useToast } from '../../components/common/Toast'
import { Modal } from '../../components/common/Modal'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'
import { createCustomPart, listCustomParts, deleteCustomPart } from '../../utils/api'
import type { Point2D, SketchState } from './types'
import { DrawCanvas } from './canvas/DrawCanvas'
import { simplifyPath } from './canvas/paperCanvas'
import { snapClose } from './canvas/closePathDetect'
import { ExtrudePreview } from './preview3d/ExtrudePreview'
import { buildUserPartDef } from './buildUserPartDef'
import { MyPartsStrip } from './MyPartsStrip'

// 首尾吸合容差（px）。②建议 ~画布对角线 2~3%，M1 先用固定值，后续按画布尺寸自适应。
const CLOSE_THRESHOLD = 24

// 用途 = v2 用户零件类别（只允许四结构类，永不含电子件）。标签用 12 岁能懂的词。
const USAGE: { key: UserPartCategory; label: string }[] = [
  { key: 'landing', label: '机臂' },
  { key: 'guard', label: '保护罩' },
  { key: 'joint', label: '衔接件' },
  { key: 'deco', label: '装饰' },
]

export function PartStudioPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const token = useAuthStore((s) => s.token)
  const userId = useAuthStore((s) => s.user?.id)
  const openLogin = useUIStore((s) => s.openLoginModal)
  const [sketch, setSketch] = useState<SketchState | null>(null)
  const [history, setHistory] = useState<SketchState[]>([])
  const [raised, setRaised] = useState(false)
  const [actAs, setActAs] = useState<UserPartCategory>('landing')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserPartDTO | null>(null)
  const [deleting, setDeleting] = useState(false)

  // 「我的零件」列表走 TanStack Query（§4.1 服务端数据规范）：进页面拉一次，
  // 保存/删除后 refetch 刷新。游客无服务端数据，enabled=false 不发请求。
  const { data: myParts = [], refetch: refetchMyParts, isError: partsError } = useQuery({
    queryKey: ['custom-parts', userId],
    queryFn: async (): Promise<UserPartDTO[]> => {
      const res = await listCustomParts(1, 50)
      if (!res.success) throw new Error(res.error || '获取零件失败')
      return res.data?.items ?? []
    },
    enabled: !!token,
  })

  const handleStroke = useCallback(
    (raw: Point2D[]) => {
      const simplified = simplifyPath(raw)
      const { points, closed } = snapClose(simplified, CLOSE_THRESHOLD)
      setHistory((h) => (sketch ? [...h, sketch] : h))
      setSketch({ points, closed })
      setRaised(false)
    },
    [sketch],
  )

  const raise = useCallback(() => {
    if (sketch?.closed) setRaised(true)
  }, [sketch])

  const undo = useCallback(() => {
    setRaised(false)
    if (history.length === 0) {
      setSketch(null)
      return
    }
    setSketch(history[history.length - 1])
    setHistory((h) => h.slice(0, -1))
  }, [history])

  const clearAll = useCallback(() => {
    setSketch(null)
    setHistory([])
    setRaised(false)
  }, [])

  // 保存：闭合轮廓 → 组 v2 UserPartDef → 存服务器（草稿）→ 刷新「我的零件」
  const handleSave = useCallback(async () => {
    if (!sketch?.closed || saving) return
    if (!token) {
      toast.push('info', '先登录，就能把零件存进「我的零件」')
      openLogin()
      return
    }
    setSaving(true)
    try {
      const def = buildUserPartDef({
        name,
        category: actAs,
        points: sketch.points,
        closed: sketch.closed,
      })
      const res = await createCustomPart(def)
      if (useAuthStore.getState().token !== token) return
      if (res.success && res.data) {
        toast.push('success', `已保存「${res.data.name}」到我的零件`)
        setName('')
        setSketch(null)
        setHistory([])
        setRaised(false)
        await refetchMyParts()
      } else {
        toast.push('error', res.error || '保存失败，再试一次')
      }
    } catch {
      toast.push('error', '零件保存失败，当前轮廓仍保留，请重试')
    } finally {
      setSaving(false)
    }
  }, [sketch, saving, token, name, actAs, toast, refetchMyParts, openLogin])

  const handleDelete = useCallback(
    async (id: string) => {
      if (deleting) return
      const requestToken = useAuthStore.getState().token
      setDeleting(true)
      const res = await deleteCustomPart(id)
      setDeleting(false)
      if (useAuthStore.getState().token !== requestToken) { setDeleteTarget(null); return }
      if (res.success) {
        setDeleteTarget(null)
        toast.push('success', '已删除')
        await refetchMyParts()
      } else {
        toast.push('error', res.error || '删除失败')
      }
    },
    [toast, refetchMyParts, deleting],
  )

  const canRaise = !!sketch?.closed
  const canSave = !!sketch?.closed && !saving
  const showGapHint = !!sketch && !sketch.closed

  // 返回：优先回到来时的页面（搭建流程或零件库），直链进来无上一页时回工作台
  const handleBack = useCallback(() => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/design')
  }, [navigate])

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-[#F5F9FF] text-slate-800">
      {partsError && <div role="alert" className="flex items-center justify-between gap-3 bg-amber-50 px-5 py-3 text-sm text-amber-900">零件列表加载失败，画布内容仍保留。<button type="button" onClick={() => void refetchMyParts()} className="rounded border border-amber-300 px-3 py-1">重试</button></div>}
      {/* 顶部：当什么用 + 名字 + 保存 */}
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E2ECF7] bg-white px-5 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-sky-50 hover:text-ink-900"
        >
          <ArrowLeft size={16} /> 返回
        </button>
        <h1 className="text-lg font-semibold">✏️ 自己画一个</h1>
        <div className="flex items-center gap-1 rounded-full bg-[#EAF2FB] p-1">
          {USAGE.map((u) => (
            <button
              key={u.key}
              type="button"
              onClick={() => setActAs(u.key)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                actAs === u.key ? 'bg-[#1E9BFF] text-white shadow' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
        <input
          aria-label="零件名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="给零件起个名字"
          maxLength={40}
          className="ml-auto w-44 rounded-full border border-[#D5E3F2] bg-white px-4 py-1.5 text-sm outline-none focus:border-[#1E9BFF]"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          title={canSave ? '保存到我的零件' : '先画一个封闭的形状'}
          className={`rounded-full px-5 py-1.5 text-sm font-semibold transition ${
            canSave
              ? 'bg-[#1E9BFF] text-white hover:bg-[#1789e6]'
              : 'cursor-not-allowed bg-slate-200 text-slate-400'
          }`}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </header>

      {/* 主体：左画布 + 右 3D */}
      <div className="flex min-h-[640px] flex-1 flex-col md:min-h-[520px] md:flex-row">
        {/* 左：画布 */}
        <section className="relative min-h-[360px] flex-1 border-b border-[#E2ECF7] md:border-b-0 md:border-r">
          <DrawCanvas outline={sketch?.points ?? null} closed={!!sketch?.closed} onStroke={handleStroke} />
          {!sketch && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="rounded-2xl bg-white/80 px-6 py-4 text-center text-slate-500">
                用笔或手指，在这里画一个封闭的形状 ✏️
              </p>
            </div>
          )}
          {showGapHint && (
            <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-[#FFF0F0] px-4 py-2 text-sm text-[#D34141] shadow">
              这里还有个缺口，把它画拢就能立起来啦
            </div>
          )}
          {/* 底部工具条 */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-3 py-2 shadow-lg">
            <ToolButton onClick={undo} disabled={!sketch && history.length === 0} label="↩️ 撤销" />
            <ToolButton onClick={clearAll} disabled={!sketch} label="🧹 清空" />
            <button
              type="button"
              onClick={raise}
              disabled={!canRaise}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                canRaise
                  ? 'bg-[#1E9BFF] text-white hover:bg-[#1789e6]'
                  : 'cursor-not-allowed bg-slate-100 text-slate-400'
              }`}
            >
              立起来 →
            </button>
          </div>
        </section>

        {/* 右：3D 预览 */}
        <section className="relative min-h-[280px] flex-1">
          {raised && sketch?.closed ? (
            <ExtrudePreview outline={sketch.points} />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#F5F9FF]">
              <p className="max-w-xs text-center text-slate-400">
                画好封闭形状后，点「立起来」就能在这里看到它变成 3D 啦
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 底部：我的零件（已保存的自制件，刷新后仍在 = 真落库） */}
      <MyPartsStrip parts={myParts} onDelete={(id) => setDeleteTarget(myParts.find(part => part.id === id) ?? null)} />
      <Modal open={!!deleteTarget} title="删除零件" onClose={() => { if (!deleting) setDeleteTarget(null) }}>
        <p className="text-sm text-slate-600">确定删除「{deleteTarget?.name}」吗？删除后无法恢复。</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className="rounded-full border px-4 py-2 text-sm">取消</button>
          <button type="button" disabled={deleting} onClick={() => { if (deleteTarget) void handleDelete(deleteTarget.id) }} className="rounded-full bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50">{deleting ? '删除中…' : '确认删除'}</button>
        </div>
      </Modal>
    </div>
  )
}

function ToolButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full px-4 py-2 text-sm transition ${
        disabled ? 'cursor-not-allowed text-slate-300' : 'text-slate-600 hover:bg-[#EAF2FB]'
      }`}
    >
      {label}
    </button>
  )
}
