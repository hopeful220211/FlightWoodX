import { useState, useEffect } from 'react'
import { useDesignStore } from '../../stores/designStore'
import { useDesignSync } from '../../hooks/useDesignSync'
import { DesignPage } from './DesignPage'
import { GuidedDesignPage } from './GuidedDesignPage'
import { WelcomeEmptyState } from './components/WelcomeEmptyState'
import { DesignListModal } from './components/DesignListModal'

/**
 * Routes between Welcome / Guided / Free modes based on state.
 * - No active design + no history → Welcome
 * - No active design + 1 unfinished design → auto-resume
 * - No active design + multiple designs → Welcome with "view history"
 * - Active guided design → GuidedDesignPage
 * - Active free design → DesignPage (legacy)
 */
export function DesignPageRouter() {
  const designs = useDesignStore(s => s.designs)
  const activeDesignId = useDesignStore(s => s.activeDesignId)
  const activeDesign = useDesignStore(s => s.getActiveDesign())
  const createDesign = useDesignStore(s => s.createDesign)
  const setActiveDesignId = useDesignStore(s => s.setActiveDesignId)
  const { loadFromServer } = useDesignSync()
  const [showHistory, setShowHistory] = useState(false)
  const [autoResumed, setAutoResumed] = useState(false)

  // 进入设计页：从账号拉回设计合并进本地（跨设备/新设备还原）。
  // 仅认领数据，自动新建空设计要用户点击，不会和这里抢跑。
  useEffect(() => {
    loadFromServer()
  }, [loadFromServer])

  // Auto-resume: if user has exactly 1 unfinished design and no active selection, resume it
  useEffect(() => {
    if (activeDesignId || autoResumed) return
    const unfinished = designs.filter(d => {
      const mode = d.buildMode ?? 'free'
      if (mode === 'free') return false
      return (d.stepReached ?? 0) < 6
    })
    if (unfinished.length === 1) {
      setActiveDesignId(unfinished[0].id)
      setAutoResumed(true)
    }
  }, [activeDesignId, designs, setActiveDesignId, autoResumed])

  // No active design — show welcome or history
  if (!activeDesign) {
    const handleStartNew = () => {
      const count = designs.length + 1
      const id = createDesign(`我的第 ${count} 架无人机`, 'guided')
      setActiveDesignId(id)
    }

    return (
      <>
        <WelcomeEmptyState
          onStartNew={handleStartNew}
          onViewHistory={designs.length > 0 ? () => setShowHistory(true) : undefined}
          historyCount={designs.length}
        />
        {showHistory && (
          <DesignListModal
            designs={designs}
            onSelect={(id) => { setActiveDesignId(id); setShowHistory(false) }}
            onClose={() => setShowHistory(false)}
          />
        )}
      </>
    )
  }

  // Guided mode
  if (activeDesign.buildMode === 'guided') {
    return <GuidedDesignPage />
  }

  // Free mode (legacy designs)
  return <DesignPage />
}
