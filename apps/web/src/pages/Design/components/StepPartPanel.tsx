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
      <div className="p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-2">第 {info.number} 步 · {info.label}</h3>
        <p className="text-xs text-gray-500 mb-3">电机会自动安装在每条机臂末端。</p>
        <div className="space-y-2">
          <label className="block text-xs text-gray-600">电机型号</label>
          <div className="space-y-1">
            {['小型 (7mm)', '中型 (8.5mm)', '大型 (10mm)'].map(spec => (
              <button
                key={spec}
                className="w-full text-left px-3 py-2 text-sm rounded-md border border-gray-200 hover:border-tech-300 hover:bg-tech-50"
              >
                {spec}
              </button>
            ))}
          </div>
          <label className="block text-xs text-gray-600 mt-3">螺旋桨颜色</label>
          <div className="flex gap-2">
            {['黑', '白', '红'].map(color => (
              <button
                key={color}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 hover:border-tech-300"
              >
                {color}
              </button>
            ))}
          </div>
        </div>
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
