import { useDesignStore } from '../../stores/designStore'
import { DesignPage } from './DesignPage'
import { GuidedDesignPage } from './GuidedDesignPage'

/**
 * Routes between Guided and Free design modes based on the active design's buildMode.
 * New designs default to 'guided' mode.
 */
export function DesignPageRouter() {
  const activeDesign = useDesignStore(s => s.getActiveDesign())

  // If no active design yet, or it's guided mode, show guided page
  if (!activeDesign || activeDesign.buildMode === 'guided') {
    return <GuidedDesignPage />
  }

  // Free mode: use existing DesignPage
  return <DesignPage />
}
