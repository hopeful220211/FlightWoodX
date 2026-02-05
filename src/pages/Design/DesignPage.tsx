import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  Eye,
  Save,
  Upload,
  Box,
  Search,
  X,
  Info,
  ChevronRight,
  List,
  SlidersHorizontal,
  Compass,
  Share2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { Modal } from '../../components/common/Modal'
import { useToast } from '../../components/common/Toast'
import { useDesignStore } from '../../stores/designStore'
import type { Part } from '../../types/design'
import { cn } from '../../utils/cn'
import { downloadTextFile } from '../../utils/download'
import { partsData } from '../../data/parts'
import { ThreeCanvas } from '../../components/design/ThreeCanvas'
import { DraggablePartCard } from './components/DraggablePartCard'
import { DragPreview } from '../../components/design/DragPreview'
import { PartPreview3D } from '../../components/design/PartPreview3D'
import { getCachedPartConnectors } from '../../hooks/usePartConnectors'
import type { CameraView } from '../../components/design/CameraController'

export function DesignPage() {
  const toast = useToast()
  const threeMountRef = useRef<HTMLDivElement | null>(null)

  const designs = useDesignStore((s) => s.designs)
  const activeDesignId = useDesignStore((s) => s.activeDesignId)
  const getActiveDesign = useDesignStore((s) => s.getActiveDesign)
  const createDesign = useDesignStore((s) => s.createDesign)
  const setActiveDesignId = useDesignStore((s) => s.setActiveDesignId)
  const addPartSmart = useDesignStore((s) => s.addPartSmart)
  const removePartFromActiveDesign = useDesignStore((s) => s.removePartFromActiveDesign)
  const setDraggingPartId = useDesignStore((s) => s.setDraggingPartId)

  const [category, setCategory] = useState<string>('body')
  const [query, setQuery] = useState('')
  const [partDetail, setPartDetail] = useState<Part | null>(null)
  const [previewHintOpen, setPreviewHintOpen] = useState(false)
  const [isPartsLibraryOpen, setIsPartsLibraryOpen] = useState(true)
  const [isInspectorOpen, setIsInspectorOpen] = useState(true)
  const [cameraView, setCameraView] = useState<CameraView | null>(null)

  // 拖拽预览状态
  const [dragPreview, setDragPreview] = useState<{
    part: Part | null
    position: { x: number; y: number }
  }>({ part: null, position: { x: 0, y: 0 } })

  useEffect(() => {
    if (!activeDesignId) {
      const id = createDesign('我的第一架无人机')
      setActiveDesignId(id)
    }
  }, [activeDesignId, createDesign, setActiveDesignId])

  // 触控拖拽状态
  const [isTouchDragging, setIsTouchDragging] = useState(false)

  // 全局拖拽事件处理（鼠标）
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (dragPreview.part) {
        setDragPreview((prev) => ({
          ...prev,
          position: { x: e.clientX, y: e.clientY },
        }))
      }
    }

    const handleDragEnd = () => {
      setDragPreview({ part: null, position: { x: 0, y: 0 } })
      setDraggingPartId(null)
    }

    const handleDrop = () => {
      setDragPreview({ part: null, position: { x: 0, y: 0 } })
      setDraggingPartId(null)
    }

    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragend', handleDragEnd)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragend', handleDragEnd)
      document.removeEventListener('drop', handleDrop)
    }
  }, [dragPreview.part, setDraggingPartId])

  // 全局触控拖拽事件处理
  useEffect(() => {
    if (!isTouchDragging) return

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault() // 防止页面滚动
      const touch = e.touches[0]
      if (touch && dragPreview.part) {
        setDragPreview((prev) => ({
          ...prev,
          position: { x: touch.clientX, y: touch.clientY },
        }))
        // 触发自定义事件，让 ThreeCanvas 处理连接点高亮
        window.dispatchEvent(new CustomEvent('touchDragMove', {
          detail: { x: touch.clientX, y: touch.clientY, partId: dragPreview.part.id }
        }))
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      // 触发放置事件
      const touch = e.changedTouches[0]
      if (touch && dragPreview.part) {
        window.dispatchEvent(new CustomEvent('touchDragEnd', {
          detail: { x: touch.clientX, y: touch.clientY, partId: dragPreview.part.id }
        }))
      }
      setDragPreview({ part: null, position: { x: 0, y: 0 } })
      setDraggingPartId(null)
      setIsTouchDragging(false)
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isTouchDragging, dragPreview.part, setDraggingPartId])

  // 开始拖拽时设置预览（鼠标）
  const handleDragStart = useCallback((part: Part, e: React.DragEvent) => {
    setDragPreview({
      part,
      position: { x: e.clientX, y: e.clientY },
    })
    // 设置正在拖拽的零件ID（用于显示可用连接点）
    setDraggingPartId(part.id)
    // 隐藏默认的拖拽图像
    const emptyImg = new Image()
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    e.dataTransfer.setDragImage(emptyImg, 0, 0)
  }, [setDraggingPartId])

  // 开始触控拖拽
  const handleTouchDragStart = useCallback((part: Part, x: number, y: number) => {
    setDragPreview({
      part,
      position: { x, y },
    })
    setDraggingPartId(part.id)
    setIsTouchDragging(true)
  }, [setDraggingPartId])

  const parts = useMemo(() => partsData, [])
  const partById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts])
  const activeDesign = useMemo(() => getActiveDesign(), [getActiveDesign, designs, activeDesignId])

  const usedParts = useMemo(() => activeDesign?.parts ?? [], [activeDesign?.parts])
  const usedCount = usedParts.length

  const totalWeight = useMemo(() => {
    let sum = 0
    for (const inst of usedParts) {
      const p = partById.get(inst.partId)
      if (p) sum += p.weight
    }
    return sum
  }, [partById, usedParts])

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return parts
      .filter((p) => p.category === category)
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
  }, [category, parts, query])

  const onAddPart = (partId: string) => {
    addPartSmart(partId)
    toast.push('success', '已添加零件')
  }

  const checks = useMemo(() => {
    if (usedCount === 0) return [{ level: 'warning', text: '还没有添加零件：从左侧零件库开始吧！' }]
    const issues: Array<{ level: 'warning' | 'error' | 'info'; text: string }> = []
    if (!usedParts.some((p) => (partById.get(p.partId)?.category ?? 'other') === 'body'))
      issues.push({ level: 'error', text: '缺少机身：建议至少选择一个机身零件。' })
    if (!usedParts.some((p) => (partById.get(p.partId)?.category ?? 'other') === 'wing'))
      issues.push({ level: 'warning', text: '还没有机翼：升力可能不足（概念提示）。' })
    if (totalWeight > 120) issues.push({ level: 'warning', text: '总重量偏大：尝试使用更轻量的零件。' })
    if (issues.length === 0) issues.push({ level: 'info', text: '基础检查通过（模拟）：可以继续优化重心与推重比。' })
    return issues
  }, [partById, totalWeight, usedCount, usedParts])

  const categoryItems = [
    { value: 'body', label: '机身' },
    { value: 'arm', label: '机臂' },
    { value: 'wing', label: '机翼' },
    { value: 'tail', label: '尾翼' },
    { value: 'connector', label: '连接件' },
    { value: 'motor_mount', label: '电机座' },
    { value: 'other', label: '其他' },
  ] as const

  const onExport = () => {
    const json = JSON.stringify(activeDesign ?? null, null, 2)
    downloadTextFile(`design_${activeDesign?.id ?? 'draft'}.json`, json)
    toast.push('success', '已导出设计文件（JSON）')
  }

  const onSave = () => {
    toast.push('success', '已自动保存到本地（persist）')
  }

  const categoryIcon: Record<string, React.ReactNode> = {
    body: <Box size={18} />,
    arm: <Share2 size={18} />,
    wing: <Compass size={18} />,
    tail: <ChevronRight size={18} />,
    connector: <Share2 size={18} />,
    motor_mount: <SlidersHorizontal size={18} />,
    other: <List size={18} />,
  }

  const renderPartThumb = (p: Part) => (
    <div key={p.id} className="relative">
      <DraggablePartCard
        part={p}
        onClick={() => setPartDetail(p)}
        onDragStart={(e) => handleDragStart(p, e)}
        onTouchDragStart={handleTouchDragStart}
      />
      <button
        type="button"
        className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-white/90 text-slate-800 shadow-sm ring-1 ring-black/5 backdrop-blur hover:bg-white dark:bg-slate-950/80 dark:text-slate-100 dark:ring-white/10"
        aria-label={`零件详情：${p.name}`}
        onClick={() => setPartDetail(p)}
      >
        <Info size={16} />
      </button>
    </div>
  )

  // 旧的“已使用零件”渲染函数已被新版浮动面板内联实现

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden bg-gradient-to-br from-wood-50 to-tech-50 dark:from-slate-950 dark:to-slate-900">
      {/* 3D 画布区域：最大化，铺满父容器 */}
      <div
        ref={threeMountRef}
        className="absolute inset-0 flex items-center justify-center bg-slate-50/60 dark:bg-slate-950/60"
      >
        <ThreeCanvas cameraView={cameraView} onCameraViewChanged={() => setCameraView(null)} />
        {/* ActionMenu 需要在 Canvas 内部，通过 HTML overlay 渲染 */}
      </div>

      {/* 顶部：标题与操作栏（浮动） */}
      <div className="absolute left-1/2 top-4 z-40 w-[min(900px,calc(100vw-2rem))] -translate-x-1/2">
        <Card hoverable={false} className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-wood-900 dark:text-white">{activeDesign?.name ?? '我的第一架无人机'}</div>
              <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                已使用 {usedCount} 个零件 · 预估重量 {totalWeight}g
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" leftIcon={<Save size={16} />} onClick={onSave}>
                保存
              </Button>
              <Button size="sm" variant="outline" leftIcon={<Upload size={16} />} onClick={onExport}>
                导出
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Eye size={16} />}
                onClick={() => setPreviewHintOpen(true)}
              >
                预览
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* 左下角：视角控制器 */}
      <div className="absolute bottom-4 left-4 z-40 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-xl bg-white/70 backdrop-blur dark:bg-slate-950/60',
            cameraView === 'front' && 'bg-wood-200 dark:bg-slate-800'
          )}
          onClick={() => setCameraView('front')}
        >
          正视图
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-xl bg-white/70 backdrop-blur dark:bg-slate-950/60',
            cameraView === 'top' && 'bg-wood-200 dark:bg-slate-800'
          )}
          onClick={() => setCameraView('top')}
        >
          俯视图
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'rounded-xl bg-white/70 backdrop-blur dark:bg-slate-950/60',
            cameraView === 'side' && 'bg-wood-200 dark:bg-slate-800'
          )}
          onClick={() => setCameraView('side')}
        >
          侧视图
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl bg-white/70 backdrop-blur dark:bg-slate-950/60"
          onClick={() => setCameraView('reset')}
        >
          重置
        </Button>
      </div>

      {/* 左侧：零件库浮动面板（可收起） */}
      <div className={cn('absolute left-4 top-1/2 z-40 -translate-y-1/2 transition-transform duration-300', isPartsLibraryOpen ? 'w-80' : 'w-12')}>
        {isPartsLibraryOpen ? (
          <Card hoverable={false} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold">零件库</div>
              <button
                type="button"
                className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-wood-50 dark:hover:bg-slate-900"
                aria-label="收起零件库"
                onClick={() => setIsPartsLibraryOpen(false)}
              >
                <PanelLeftClose size={18} />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {categoryItems.map((it) => {
                const active = category === it.value
                return (
                  <button
                    key={it.value}
                    type="button"
                    className={cn(
                      'touch-target inline-flex items-center justify-center rounded-2xl transition',
                      'h-11 w-full justify-start gap-2 px-3',
                      active
                        ? 'bg-wood-200 text-wood-900 dark:bg-slate-800 dark:text-white'
                        : 'hover:bg-wood-50 text-slate-700 dark:text-slate-200 dark:hover:bg-slate-900',
                    )}
                    onClick={() => setCategory(it.value)}
                  >
                    <span className="inline-flex">{categoryIcon[it.value]}</span>
                    <span className="text-sm font-semibold">{it.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 backdrop-blur dark:border-white/10 dark:bg-slate-950/40">
              <Search size={16} className="text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索零件…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
              {query ? (
                <button
                  type="button"
                  className="touch-target inline-flex items-center justify-center rounded-xl hover:bg-wood-50 dark:hover:bg-slate-900"
                  aria-label="清除搜索"
                  onClick={() => setQuery('')}
                >
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-4 justify-items-center">
              {filteredParts.length ? (
                filteredParts.map(renderPartThumb)
              ) : (
                <div className="col-span-2">
                  <EmptyState icon={<Box size={18} />} title="没有找到零件" description="换个关键词试试，或切换分类。" />
                </div>
              )}
            </div>
          </Card>
        ) : (
          <button
            type="button"
            className="flex h-20 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm backdrop-blur hover:bg-white/90 dark:bg-slate-950/60 dark:hover:bg-slate-950/80"
            aria-label="展开零件库"
            onClick={() => setIsPartsLibraryOpen(true)}
          >
            <PanelLeftOpen size={20} />
          </button>
        )}
      </div>

      {/* 右侧：检查浮动面板（可收起） */}
      <div className={cn('absolute right-4 top-1/2 z-40 -translate-y-1/2 transition-transform duration-300', isInspectorOpen ? 'w-72' : 'w-12')}>
        {isInspectorOpen ? (
          <Card hoverable={false} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-extrabold">检查</div>
              <button
                type="button"
                className="touch-target inline-flex h-8 w-8 items-center justify-center rounded-xl hover:bg-wood-50 dark:hover:bg-slate-900"
                aria-label="收起检查面板"
                onClick={() => setIsInspectorOpen(false)}
              >
                <PanelRightClose size={18} />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-950/40">
                <div className="text-sm font-extrabold">设计检查</div>
                <div className="mt-2 space-y-2">
                  {checks.map((c, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-sm',
                        c.level === 'error'
                          ? 'border-error/30 bg-error/5'
                          : c.level === 'warning'
                            ? 'border-warning/30 bg-warning/5'
                            : 'border-tech-400/30 bg-tech-50/60 dark:bg-tech-900/20',
                      )}
                    >
                      {c.text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white/60 p-3 text-sm dark:bg-slate-950/40">
                <div className="text-sm font-extrabold">已使用零件</div>
                <div className="mt-2 space-y-1">
                  {usedParts.length ? (
                    usedParts.map((inst) => {
                      const part = partById.get(inst.partId)
                      const connectorCount = part ? getCachedPartConnectors(part.modelUrl).length : 0
                      return (
                        <div
                          key={inst.instanceId}
                          className="flex items-center justify-between gap-2 rounded-xl px-2 py-1 hover:bg-wood-50 dark:hover:bg-slate-900"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-bold">{part?.name ?? '未知零件'}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <span>{part?.weight ?? 0}g</span>
                              <span>·</span>
                              <span>{connectorCount} 个连接点</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="rounded-full"
                            onClick={() => removePartFromActiveDesign(inst.instanceId)}
                            aria-label="删除"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-slate-600 dark:text-slate-300">暂无</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <button
            type="button"
            className="flex h-20 w-12 items-center justify-center rounded-2xl bg-white/70 shadow-sm backdrop-blur hover:bg-white/90 dark:bg-slate-950/60 dark:hover:bg-slate-950/80"
            aria-label="展开检查面板"
            onClick={() => setIsInspectorOpen(true)}
          >
            <PanelRightOpen size={20} />
          </button>
        )}
      </div>


      {/* 零件详情弹窗（点击缩略图/详情按钮触发） */}
      <Modal open={partDetail !== null} onClose={() => setPartDetail(null)} title={partDetail?.name ?? ''}>
        {partDetail ? (
          <div className="space-y-3">
            {/* 3D 预览 */}
            <div className="aspect-video w-full rounded-2xl bg-slate-50/60 ring-1 ring-black/5 dark:bg-slate-950/60 dark:ring-white/10 overflow-hidden">
              <div className="h-full w-full">
                <PartPreview3D modelUrl={partDetail.modelUrl} autoRotate />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-2xl bg-wood-50 p-3 dark:bg-slate-900">
                <div className="text-xs text-slate-600 dark:text-slate-300">重量</div>
                <div className="mt-1 font-extrabold">{partDetail.weight} g</div>
              </div>
              <div className="rounded-2xl bg-wood-50 p-3 dark:bg-slate-900">
                <div className="text-xs text-slate-600 dark:text-slate-300">连接点</div>
                <div className="mt-1 font-extrabold">{getCachedPartConnectors(partDetail.modelUrl).length} 个</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setPartDetail(null)}>
                取消
              </Button>
              <Button
                onClick={() => {
                  onAddPart(partDetail.id)
                  setPartDetail(null)
                }}
              >
                添加到设计
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={previewHintOpen} onClose={() => setPreviewHintOpen(false)} title="预览（占位）">
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-200">
          <p>预览功能后续会跳转到独立的 3D 预览页面。</p>
          <p>当前阶段：已为 Three.js 场景挂载预留了画布容器 ref。</p>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setPreviewHintOpen(false)}>
              我知道了
            </Button>
          </div>
        </div>
      </Modal>

      {/* 拖拽预览 */}
      {dragPreview.part && (
        <DragPreview
          modelUrl={dragPreview.part.modelUrl}
          position={dragPreview.position}
        />
      )}
    </div>
  )
}

