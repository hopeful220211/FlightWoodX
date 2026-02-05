// src/pages/Design/components/DraggablePartCard.tsx
// 注意：此组件需要在 Canvas 外部使用，使用 HTML5 drag and drop
// 拖拽逻辑在 ThreeCanvas 的 DragHandler 中处理
import { lazy, Suspense } from 'react'
import type { Part } from '../../../types/design'

// 懒加载 3D 预览组件，避免首次加载时的性能问题
const PartPreview3D = lazy(() => import('../../../components/design/PartPreview3D').then(m => ({ default: m.PartPreview3D })))

interface DraggablePartCardProps {
  part: Part
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onTouchDragStart?: (part: Part, x: number, y: number) => void
}

// 判断是否为有效的 3D 模型
function hasValid3DModel(modelUrl: string): boolean {
  return Boolean(modelUrl && !modelUrl.includes('placeholder'))
}

// 占位符缩略图
function PlaceholderThumb({ name, thumbnailUrl }: { name: string; thumbnailUrl?: string }) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={name}
        className="w-full h-full object-cover"
        draggable={false}
      />
    )
  }
  return (
    <div className="w-full h-full bg-gradient-to-br from-wood-100 to-wood-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
      <span className="text-xs text-wood-600 dark:text-slate-400 text-center px-1">{name}</span>
    </div>
  )
}

// 加载中占位符
function LoadingPlaceholder() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-wood-50 to-wood-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-wood-300 border-dashed rounded animate-spin" />
    </div>
  )
}

export function DraggablePartCard({ part, onClick, onDragStart, onTouchDragStart }: DraggablePartCardProps) {
  const has3DModel = hasValid3DModel(part.modelUrl)

  const handleTouchStart = (e: React.TouchEvent) => {
    // 防止触发点击事件
    const touch = e.touches[0]
    if (touch && onTouchDragStart) {
      // 延迟一点启动拖拽，避免误触
      const startX = touch.clientX
      const startY = touch.clientY

      const handleTouchMove = (moveEvent: TouchEvent) => {
        const moveTouch = moveEvent.touches[0]
        if (moveTouch) {
          const dx = Math.abs(moveTouch.clientX - startX)
          const dy = Math.abs(moveTouch.clientY - startY)
          // 移动超过 10px 才开始拖拽
          if (dx > 10 || dy > 10) {
            onTouchDragStart(part, moveTouch.clientX, moveTouch.clientY)
            document.removeEventListener('touchmove', handleTouchMove)
          }
        }
      }

      const handleTouchEnd = () => {
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }

      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', part.id)
        e.dataTransfer.effectAllowed = 'copy'
        onDragStart?.(e)
      }}
      onTouchStart={handleTouchStart}
      onClick={onClick}
      style={{ touchAction: 'none' }}
      className="flex flex-col items-center gap-1.5"
    >
      <div className="w-[100px] h-[100px] overflow-hidden rounded-2xl ring-1 ring-black/5 transition-transform hover:scale-[1.03] dark:ring-white/10">
        {has3DModel ? (
          <Suspense fallback={<LoadingPlaceholder />}>
            <PartPreview3D modelUrl={part.modelUrl} size={100} />
          </Suspense>
        ) : (
          <PlaceholderThumb name={part.name} thumbnailUrl={part.thumbnailUrl} />
        )}
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[100px] text-center">
        {part.name}
      </span>
    </div>
  )
}
