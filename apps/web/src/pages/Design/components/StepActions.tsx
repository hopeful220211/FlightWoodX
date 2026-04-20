import type { BuildStep } from '@fwx/parts-schema'

interface StepActionsProps {
  currentStep: BuildStep
  canAdvance: boolean
  onAdvance: () => void
  onGoBack: () => void
  onReset: () => void
}

export function StepActions({ currentStep, canAdvance, onAdvance, onGoBack, onReset }: StepActionsProps) {
  const isFirstStep = currentStep === 'HUB'
  const isLastStep = currentStep === 'REVIEW'

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
          className="px-5 py-2 text-sm font-medium text-white bg-tech-500 rounded-lg hover:bg-tech-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          下一步 →
        </button>
      ) : (
        <button
          onClick={onAdvance}
          disabled={!canAdvance}
          className="px-5 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          完成并保存
        </button>
      )}
    </div>
  )
}
