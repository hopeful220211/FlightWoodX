import { useCallback } from 'react'
import { useDesignStore } from '../../stores/designStore'
import { useToast } from '../../components/common/Toast'
import { ThreeCanvas } from '../../components/design/ThreeCanvas'
import { StepProgressBar } from './components/StepProgressBar'
import { StepPartPanel } from './components/StepPartPanel'
import { StepGuide } from './components/StepGuide'
import { StepActions } from './components/StepActions'
import type { Part } from '../../types/design'

export function GuidedDesignPage() {
  const activeDesign = useDesignStore(s => s.getActiveDesign())
  const advanceStep = useDesignStore(s => s.advanceStep)
  const goBackStep = useDesignStore(s => s.goBackStep)
  const canAdvanceCheck = useDesignStore(s => s.canAdvance)
  const getStepAdvanceReason = useDesignStore(s => s.getStepAdvanceReason)
  const resetCurrentStep = useDesignStore(s => s.resetCurrentStep)
  const addPartSmart = useDesignStore(s => s.addPartSmart)
  const setDraggingPartId = useDesignStore(s => s.setDraggingPartId)
  const toast = useToast()

  const currentStep = activeDesign?.currentStep ?? 'HUB'
  const stepReached = activeDesign?.stepReached ?? 0
  const canAdvance = canAdvanceCheck()
  const advanceReason = getStepAdvanceReason()

  const handlePartClick = useCallback((part: Part) => {
    addPartSmart(part.id)
    toast.push('success', `已添加 ${part.name}`)
  }, [addPartSmart, toast])

  const handlePartDragStart = useCallback((partId: string) => {
    setDraggingPartId(partId)
  }, [setDraggingPartId])

  const handleAdvance = useCallback(() => {
    const success = advanceStep()
    if (!success && advanceReason) {
      toast.push('error', advanceReason)
    }
  }, [advanceStep, advanceReason, toast])

  const handleGoBack = useCallback(() => {
    goBackStep()
  }, [goBackStep])

  const handleReset = useCallback(() => {
    resetCurrentStep()
    toast.push('info', '已重置当前步骤')
  }, [resetCurrentStep, toast])

  if (!activeDesign) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        请先创建或选择一个设计
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Top: Step Progress */}
      <StepProgressBar currentStep={currentStep} stepReached={stepReached} />

      {/* Middle: Three columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Part selection */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <StepPartPanel
            currentStep={currentStep}
            onPartClick={handlePartClick}
            onPartDragStart={handlePartDragStart}
          />
        </aside>

        {/* Center: 3D Canvas */}
        <main className="flex-1 relative">
          <ThreeCanvas />
        </main>

        {/* Right: Guide */}
        <aside className="w-56 bg-white border-l border-gray-100 overflow-y-auto">
          <StepGuide
            currentStep={currentStep}
            canAdvance={canAdvance}
            advanceReason={advanceReason}
          />
        </aside>
      </div>

      {/* Bottom: Actions */}
      <StepActions
        currentStep={currentStep}
        canAdvance={canAdvance}
        onAdvance={handleAdvance}
        onGoBack={handleGoBack}
        onReset={handleReset}
      />
    </div>
  )
}
