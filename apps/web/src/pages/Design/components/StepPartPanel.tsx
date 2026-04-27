import { useMemo } from 'react'
import { STEP_CATEGORIES, STEP_INFO } from '@fwx/parts-schema'
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
          <p className="text-xs text-green-600 mt-1">每条起落架末端会自动安装一个电机和螺旋桨。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700">
          第 {info.number} 步 · {info.label}
          {(info as { optional?: boolean }).optional && (
            <span className="ml-1 text-xs font-normal text-ink-400">（可跳过）</span>
          )}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
      </div>

      {filteredParts.length > 0 && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-2">
            {filteredParts.map(part => (
              <div
                key={part.id}
                onClick={() => onPartClick(part)}
                className="bg-white border border-gray-200 rounded-lg p-2 cursor-pointer hover:border-tech-300 hover:shadow-sm transition-all"
              >
                {part.thumbnailUrl ? (
                  <img
                    src={part.thumbnailUrl}
                    alt={part.name}
                    className="w-full aspect-square object-contain bg-transparent rounded"
                    loading="lazy"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', part.id)
                      e.dataTransfer.effectAllowed = 'move'
                      onPartDragStart(part.id)
                    }}
                  />
                ) : (
                  <div
                    className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', part.id)
                      e.dataTransfer.effectAllowed = 'move'
                      onPartDragStart(part.id)
                    }}
                  >
                    3D
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1 truncate text-center">{part.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredParts.length === 0 && currentStep !== 'MOTOR' && currentStep !== 'REVIEW' && (
        <div className="p-4 text-center text-xs text-gray-400">此步骤暂无可选零件</div>
      )}
    </div>
  )
}
