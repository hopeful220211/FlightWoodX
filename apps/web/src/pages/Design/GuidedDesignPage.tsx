import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDesignStore } from '../../stores/designStore'
import { useToast } from '../../components/common/Toast'
import { useDesignSync } from '../../hooks/useDesignSync'
import { ThreeCanvas } from '../../components/design/ThreeCanvas'
import { StepProgressBar } from './components/StepProgressBar'
import { StepPartPanel } from './components/StepPartPanel'
import { StepGuide } from './components/StepGuide'
import { StepActions } from './components/StepActions'
import { WeightBar } from './components/WeightBar'
import { ViolationBubble } from './components/ViolationBubble'
import { checkBeforeAdd, checkDualMainboard } from '../../utils/realtimeChecks'
import type { Violation } from '../../utils/realtimeChecks'
import { MotorInstallStep } from './components/steps/MotorInstallStep'
import { ReviewStep } from './components/steps/ReviewStep'
import type { Part } from '../../types/design'

export function GuidedDesignPage() {
  const navigate = useNavigate()
  const activeDesign = useDesignStore(s => s.getActiveDesign())
  const advanceStep = useDesignStore(s => s.advanceStep)
  const goBackStep = useDesignStore(s => s.goBackStep)
  const goToStep = useDesignStore(s => s.goToStep)
  const canAdvanceCheck = useDesignStore(s => s.canAdvance)
  const getStepAdvanceReason = useDesignStore(s => s.getStepAdvanceReason)
  const resetCurrentStep = useDesignStore(s => s.resetCurrentStep)
  const addPartSmart = useDesignStore(s => s.addPartSmart)
  const setDraggingPartId = useDesignStore(s => s.setDraggingPartId)
  const toast = useToast()
  const { saveToServer } = useDesignSync()
  const [violation, setViolation] = useState<Violation | null>(null)

  const currentStep = activeDesign?.currentStep ?? 'HUB'
  const stepReached = activeDesign?.stepReached ?? 0
  const canAdvance = canAdvanceCheck()
  const advanceReason = getStepAdvanceReason()

  const handlePartClick = useCallback((part: Part) => {
    if (!activeDesign) return

    // Real-time validation before adding
    const v = checkBeforeAdd(part.category, part.id, activeDesign.parts)
    if (v) {
      setViolation({ ...v }) // new ref to re-trigger bubble
      return
    }

    addPartSmart(part.id)

    // Post-add check: dual mainboard geometry
    const updatedDesign = useDesignStore.getState().getActiveDesign()
    if (updatedDesign) {
      const dualCheck = checkDualMainboard(updatedDesign.parts)
      if (dualCheck) {
        setViolation({ ...dualCheck })
      }
      // Debounced sync to backend
      saveToServer(updatedDesign)
    }

    toast.push('success', `已添加 ${part.name}`)
  }, [addPartSmart, toast, activeDesign])

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

  const handleSave = useCallback(() => {
    if (activeDesign) saveToServer(activeDesign)
    toast.push('success', '已保存')
  }, [toast, activeDesign, saveToServer])

  const handleSaveAndExport = useCallback(async () => {
    if (!activeDesign) return
    navigate(`/design/export-preview/${activeDesign.id}`)
  }, [activeDesign, navigate])

  const handleArFlight = useCallback(() => {
    if (!activeDesign) return
    const hasHub = activeDesign.parts.some(p => p.category === 'mainboard')
    const hasArm = activeDesign.parts.some(p => p.category === 'landing')
    if (!hasHub || !hasArm) {
      toast.push('error', '先装好你的飞机吧！至少需要 1 个主板和 1 个起落架')
      return
    }
    navigate(`/design/ar-flight/${activeDesign.id}`)
  }, [activeDesign, navigate, toast])

  if (!activeDesign) return null

  const isMotorStep = currentStep === 'MOTOR'
  const isReviewStep = currentStep === 'REVIEW'

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
      <div className="shrink-0">
        <StepProgressBar currentStep={currentStep} stepReached={stepReached} onStepClick={goToStep} />
        {!isMotorStep && <WeightBar />}
      </div>

      <ViolationBubble violation={violation} />

      {isMotorStep ? (
        <div className="flex-1 min-h-0 bg-paper-50">
          <MotorInstallStep />
        </div>
      ) : (
        <>
          <div className="flex-1 flex min-h-0">
            <aside className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <StepPartPanel
                  currentStep={currentStep}
                  onPartClick={handlePartClick}
                  onPartDragStart={handlePartDragStart}
                />
              </div>
            </aside>

            <main className="flex-1 relative min-h-0 min-w-0">
              <ThreeCanvas />
            </main>

            <aside
              className={`${isReviewStep ? 'w-80' : 'w-56'} shrink-0 bg-white border-l border-gray-100 overflow-y-auto`}
            >
              {isReviewStep ? (
                <ReviewStep />
              ) : (
                <StepGuide
                  currentStep={currentStep}
                  canAdvance={canAdvance}
                  advanceReason={advanceReason}
                />
              )}
            </aside>
          </div>

          <div className="shrink-0">
            <StepActions
              currentStep={currentStep}
              canAdvance={canAdvance}
              onAdvance={handleAdvance}
              onGoBack={handleGoBack}
              onReset={handleReset}
              onSave={handleSave}
              onSaveAndExport={handleSaveAndExport}
              onArFlight={handleArFlight}
            />
          </div>
        </>
      )}
    </div>
  )
}
