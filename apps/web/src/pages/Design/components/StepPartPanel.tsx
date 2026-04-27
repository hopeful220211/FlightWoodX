import { useMemo, useEffect, useRef } from 'react'
import { STEP_CATEGORIES, STEP_INFO } from '@fwx/parts-schema'
import type { BuildStep, PartCategory } from '@fwx/parts-schema'
import { partsData } from '../../../data/parts'
import type { Part } from '../../../types/design'

// Pre-load all thumbnails once so setDragImage has loaded images
const thumbnailCache = new Map<string, HTMLImageElement>()
function getPreloadedThumbnail(partId: string, url: string): HTMLImageElement | null {
  if (thumbnailCache.has(partId)) {
    const img = thumbnailCache.get(partId)!
    return img.complete ? img : null
  }
  const img = new Image()
  img.src = url
  img.style.width = '64px'
  img.style.height = '64px'
  thumbnailCache.set(partId, img)
  return null // not loaded yet, will be ready next time
}

interface StepPartPanelProps {
  currentStep: BuildStep
  onPartClick: (part: Part) => void
  onPartDragStart: (partId: string) => void
}

export function StepPartPanel({ currentStep, onPartClick, onPartDragStart }: StepPartPanelProps) {
  const info = STEP_INFO[currentStep]
  const categories = STEP_CATEGORIES[currentStep]

  // Pre-load all thumbnails on mount for instant setDragImage
  useEffect(() => {
    partsData.forEach(p => {
      if (p.thumbnailUrl) getPreloadedThumbnail(p.id, p.thumbnailUrl)
    })
  }, [])

  const filteredParts = useMemo(() => {
    if (currentStep === 'MOTOR' || currentStep === 'REVIEW') return []
    return partsData.filter(p => categories.includes(p.category as PartCategory))
  }, [currentStep, categories])

  if (currentStep === 'REVIEW') {
    return (
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-2">第 {info.number} 步 · {info.label}</h3>
        <p className="text-xs text-gray-500">检查你的无人机设计，确认后保存。</p>
      </div>
    )
  }

  if (currentStep === 'MOTOR') {
    return (
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700">第 {info.number} 步 · {info.label}</h3>
          <p className="text-xs text-gray-500 mt-1">{info.description}</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm font-medium text-green-800">电机已自动安装</p>
          <p className="text-xs text-green-600 mt-1">
            每条机臂末端会自动安装一个电机和螺旋桨。你可以直接点"下一步"继续。
          </p>
        </div>

        <p className="text-xs text-gray-400">
          如果想调整机臂数量，请回到上一步。
        </p>

        {/* Future: advanced options (disabled) */}
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-500">高级选项（即将开放）</summary>
          <div className="mt-2 space-y-1 opacity-50 pointer-events-none">
            <p>电机型号：小型 / 中型 / 大型</p>
            <p>螺旋桨颜色：黑 / 白 / 红</p>
          </div>
        </details>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700">
          第 {info.number} 步 · {info.label}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
      </div>

      {/* Part grid */}
      {filteredParts.length > 0 && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {filteredParts.map(part => (
              <div
                key={part.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', part.id)
                  e.dataTransfer.effectAllowed = 'move'
                  // Custom drag image: clone the <img> already visible in the card.
                  // This avoids all setDragImage quirks — the clone IS the rendered pixel data.
                  const imgEl = e.currentTarget.querySelector('img')
                  if (imgEl) {
                    const clone = imgEl.cloneNode(true) as HTMLImageElement
                    clone.style.width = '64px'
                    clone.style.height = '64px'
                    clone.style.position = 'absolute'
                    clone.style.top = '0'
                    clone.style.left = '0'
                    clone.style.opacity = '0.01'
                    clone.style.background = 'transparent'
                    clone.style.border = 'none'
                    clone.style.padding = '0'
                    clone.style.margin = '0'
                    clone.style.borderRadius = '0'
                    clone.style.boxShadow = 'none'
                    document.body.appendChild(clone)
                    e.dataTransfer.setDragImage(clone, 32, 32)
                    setTimeout(() => clone.remove(), 100)
                  }
                  onPartDragStart(part.id)
                }}
                onClick={() => onPartClick(part)}
                className="bg-white border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-tech-300 hover:shadow-sm transition-all"
              >
                {part.thumbnailUrl ? (
                  <img
                    src={part.thumbnailUrl}
                    alt={part.name}
                    className="w-full aspect-square object-contain bg-gray-50 rounded"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                    3D
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1 truncate text-center">{part.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
