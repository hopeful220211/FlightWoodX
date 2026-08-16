import { BUILD_STEPS, STEP_INFO } from '@fwx/parts-schema'
import type { BuildStep } from '@fwx/parts-schema'

interface StepProgressBarProps {
  currentStep: BuildStep
  stepReached: number
  /** 点击「已到达」的步骤（已完成或当前）时跳转到该步；锁定步骤不可点。 */
  onStepClick?: (step: BuildStep) => void
}

export function StepProgressBar({ currentStep, stepReached, onStepClick }: StepProgressBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-gray-100">
      {BUILD_STEPS.map((step, idx) => {
        const info = STEP_INFO[step]
        const isCurrent = step === currentStep
        const isCompleted = idx < stepReached
        const isLocked = idx > stepReached
        // 已到达（已完成或当前）的步骤可点跳转；锁定的未来步骤不可点
        const isReachable = idx <= stepReached
        const clickable = isReachable && !isCurrent && !!onStepClick

        return (
          <div key={step} className="flex items-center flex-1">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick?.(step)}
              title={clickable ? `回到「${info.label}」` : undefined}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center gap-2 flex-1 rounded-lg px-1.5 py-1 -mx-1.5 text-left transition-colors ${
                clickable ? 'cursor-pointer hover:bg-sky-50' : 'cursor-default'
              }`}
            >
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
                  ${isCurrent ? 'bg-sky-500 text-white ring-2 ring-sky-200' : ''}
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isLocked ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                {isCompleted ? '✓' : info.number}
              </div>
              <span
                className={`text-xs truncate ${
                  isCurrent ? 'text-sky-600 font-semibold' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {info.label}
              </span>
            </button>
            {idx < BUILD_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 mx-1 ${idx < stepReached ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
