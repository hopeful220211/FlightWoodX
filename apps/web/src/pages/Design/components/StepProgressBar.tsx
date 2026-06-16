import { BUILD_STEPS, STEP_INFO } from '@fwx/parts-schema'
import type { BuildStep } from '@fwx/parts-schema'

interface StepProgressBarProps {
  currentStep: BuildStep
  stepReached: number
}

export function StepProgressBar({ currentStep, stepReached }: StepProgressBarProps) {
  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-white border-b border-gray-100">
      {BUILD_STEPS.map((step, idx) => {
        const info = STEP_INFO[step]
        const isCurrent = step === currentStep
        const isCompleted = idx < stepReached
        const isLocked = idx > stepReached

        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex items-center gap-2 flex-1">
              <div
                className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
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
            </div>
            {idx < BUILD_STEPS.length - 1 && (
              <div className={`h-0.5 w-4 mx-1 ${idx < stepReached ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
