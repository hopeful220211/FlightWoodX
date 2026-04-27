import { useState, useCallback, useEffect } from 'react'
import { useDesignStore } from '../../../stores/designStore'
import { partsData } from '../../../data/parts'
import type { PartInstance } from '../../../types/design'
import { checkBeforeAdd } from '../../../utils/realtimeChecks'

const CENTER_THRESHOLD = 0.03 // parts within this X distance from center don't need mirror

interface MirrorSuggestionProps {
  /** Called when user accepts mirror placement */
  onAccept?: () => void
}

/**
 * After a part is placed off-center, suggests placing a mirror copy.
 * Shows a floating bubble: "要不要在对称位置也装一个？"
 */
export function MirrorSuggestion({ onAccept }: MirrorSuggestionProps) {
  const [suggestion, setSuggestion] = useState<{
    partId: string
    partName: string
    mirrorPosition: [number, number, number]
    mirrorRotation: [number, number, number]
    originalInstanceId: string
  } | null>(null)

  const activeDesign = useDesignStore(s => s.getActiveDesign())
  const addPartToActiveDesign = useDesignStore(s => s.addPartToActiveDesign)

  // Listen for new part placements
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        partId: string
        position: [number, number, number]
        rotation: [number, number, number]
        instanceId: string
        category: string
      } | undefined
      if (!detail) return

      // Only suggest for categories that benefit from symmetry
      if (detail.category !== 'landing' && detail.category !== 'guard') return

      // Only if placed off-center
      if (Math.abs(detail.position[0]) < CENTER_THRESHOLD) return

      const partData = partsData.find(p => p.id === detail.partId)
      if (!partData) return

      // Check if mirror placement would be valid
      const design = useDesignStore.getState().getActiveDesign()
      if (!design) return

      const violation = checkBeforeAdd(partData.category, partData.id, design.parts)
      if (violation) return // Would exceed limits

      setSuggestion({
        partId: detail.partId,
        partName: partData.name,
        mirrorPosition: [-detail.position[0], detail.position[1], detail.position[2]],
        mirrorRotation: [detail.rotation[0], -detail.rotation[1], -detail.rotation[2]],
        originalInstanceId: detail.instanceId,
      })
    }

    window.addEventListener('fwx-part-placed', handler)
    return () => window.removeEventListener('fwx-part-placed', handler)
  }, [])

  const handleAccept = useCallback(() => {
    if (!suggestion || !activeDesign) return

    addPartToActiveDesign({
      partId: suggestion.partId,
      category: partsData.find(p => p.id === suggestion.partId)?.category ?? 'landing',
      position: suggestion.mirrorPosition,
      rotation: suggestion.mirrorRotation,
    })

    setSuggestion(null)
    onAccept?.()
  }, [suggestion, activeDesign, addPartToActiveDesign, onAccept])

  const handleDismiss = useCallback(() => {
    setSuggestion(null)
  }, [])

  // Auto-dismiss after 5s
  useEffect(() => {
    if (!suggestion) return
    const t = setTimeout(() => setSuggestion(null), 5000)
    return () => clearTimeout(t)
  }, [suggestion])

  if (!suggestion) return null

  return (
    <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50">
      <div
        className="bg-white/95 backdrop-blur-sm border border-accent-sky/30 rounded-lg shadow-lg px-5 py-3 flex items-center gap-4"
        style={{ animation: 'fadeInUp 300ms ease-out' }}
      >
        <p className="text-sm text-ink-900">
          要不要在对称位置也装一个 <span className="font-medium">{suggestion.partName}</span>？
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAccept}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent-leaf rounded-md hover:brightness-[0.92]"
          >
            好的
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-ink-400 hover:text-ink-600"
          >
            不了
          </button>
        </div>
      </div>
    </div>
  )
}
