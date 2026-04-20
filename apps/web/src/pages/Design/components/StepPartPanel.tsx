import { useState, useMemo } from 'react'
import { STEP_CATEGORIES, STEP_INFO, getPartsForStep } from '@fwx/parts-schema'
import type { BuildStep, PartCategory } from '@fwx/parts-schema'
import { partsData } from '../../../data/parts'
import type { Part } from '../../../types/design'

interface StepPartPanelProps {
  currentStep: BuildStep
  onPartClick: (part: Part) => void
  onPartDragStart: (partId: string) => void
}

export function StepPartPanel({ currentStep, onPartClick, onPartDragStart }: StepPartPanelProps) {
  const info = STEP_INFO[currentStep]
  const categories = STEP_CATEGORIES[currentStep]

  // For GUARD step, allow sub-type selection
  const [guardSubType, setGuardSubType] = useState<PartCategory | null>(null)

  const isGuardStep = currentStep === 'GUARD'

  const filteredParts = useMemo(() => {
    if (currentStep === 'MOTOR' || currentStep === 'REVIEW') return []

    if (isGuardStep && guardSubType) {
      return partsData.filter(p => p.category === guardSubType)
    }

    if (isGuardStep && !guardSubType) {
      return [] // Show type selector first
    }

    return partsData.filter(p => categories.includes(p.category as PartCategory))
  }, [currentStep, categories, isGuardStep, guardSubType])

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

      {/* Guard step: sub-type selector */}
      {isGuardStep && !guardSubType && (
        <div className="p-3 space-y-2">
          <p className="text-xs text-gray-600 mb-2">选择保护罩类型：</p>
          {[
            { cat: 'PLATE' as PartCategory, label: '一体版', desc: '保护最强、最稳，适合初学者' },
            { cat: 'JOINT' as PartCategory, label: '分体版', desc: '更轻更灵活，适合中级' },
            { cat: 'LAND' as PartCategory, label: '半体版', desc: '折中方案，兼顾保护与重量' },
          ].map(({ cat, label, desc }) => (
            <button
              key={cat}
              onClick={() => setGuardSubType(cat)}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-tech-300 hover:bg-tech-50 transition-colors"
            >
              <div className="text-sm font-medium text-gray-800">{label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      )}

      {isGuardStep && guardSubType && (
        <div className="px-3 pt-2">
          <button
            onClick={() => setGuardSubType(null)}
            className="text-xs text-tech-600 hover:text-tech-700"
          >
            ← 返回选类型
          </button>
        </div>
      )}

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
                  // Use thumbnail as drag image
                  if (part.thumbnailUrl) {
                    const img = new Image()
                    img.src = part.thumbnailUrl
                    img.width = 64
                    img.height = 64
                    e.dataTransfer.setDragImage(img, 32, 32)
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
