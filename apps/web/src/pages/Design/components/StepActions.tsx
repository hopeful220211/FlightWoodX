import { useState } from 'react'
import { ArrowRight, Camera } from 'lucide-react'
import type { BuildStep } from '@fwx/parts-schema'

interface StepActionsProps {
  currentStep: BuildStep
  canAdvance: boolean
  onAdvance: () => void
  onGoBack: () => void
  onReset: () => void
  onSave?: () => void
  onSaveAndExport?: () => Promise<void>
  onArFlight?: () => void
}

export function StepActions({
  currentStep,
  canAdvance,
  onAdvance,
  onGoBack,
  onReset,
  onSave,
  onSaveAndExport,
  onArFlight,
}: StepActionsProps) {
  const isFirstStep = currentStep === 'HUB'
  const isLastStep = currentStep === 'REVIEW'
  const [exporting, setExporting] = useState(false)

  const handleSaveAndExport = async () => {
    if (!onSaveAndExport || exporting) return
    setExporting(true)
    try {
      await onSaveAndExport()
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
      <button
        onClick={onGoBack}
        disabled={isFirstStep}
        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ← 上一步
      </button>

      <button
        onClick={onReset}
        className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-md hover:border-red-200"
      >
        重置本步
      </button>

      {!isLastStep ? (
        <button
          onClick={onAdvance}
          disabled={!canAdvance}
          className="px-5 py-2 text-sm font-medium text-white bg-sky-500 rounded-md hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          下一步 →
        </button>
      ) : (
        <div className="flex items-center gap-2 flex-col-reverse sm:flex-row">
          <button
            onClick={onArFlight}
            className="inline-flex w-fit items-center gap-2 whitespace-nowrap px-5 py-2 text-sm font-medium text-wood-500 border border-wood-500/30 bg-paper-100 rounded-md hover:bg-paper-200 transition-colors"
          >
            <Camera size={16} />
            AR 试飞
          </button>
          <button
            onClick={onSave}
            className="inline-flex w-fit items-center whitespace-nowrap px-5 py-2 text-sm font-medium text-ink-900 border border-ink-200 rounded-md hover:bg-paper-100 transition-colors"
          >
            保存
          </button>
          <button
            onClick={handleSaveAndExport}
            disabled={exporting}
            className="group inline-flex w-fit items-center gap-2 whitespace-nowrap px-5 py-2 text-sm font-medium text-white bg-wood-500 rounded-md hover:brightness-[0.92] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {exporting ? '保存中...' : '保存并导出'}
            {!exporting && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
          </button>
        </div>
      )}
    </div>
  )
}
