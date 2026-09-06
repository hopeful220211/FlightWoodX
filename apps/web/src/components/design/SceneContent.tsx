import { useDesignStore } from '../../stores/designStore'
import { partsData } from '../../data/parts'
import { GLBPart } from './GLBPart'
import { PartErrorBoundary } from './PartErrorBoundary'

export function SceneContent() {
  const activeDesign = useDesignStore(state => state.getActiveDesign())
  const isDragging = useDesignStore(state => !!state.draggingPartId)

  return <>{activeDesign?.parts.map(instance => {
    const partData = partsData.find(p => p.id === instance.partId)
    if (!partData) return null
    return (
      <PartErrorBoundary key={instance.instanceId} partId={instance.partId}>
        <GLBPart instance={instance} partData={partData} dimmed={isDragging} />
      </PartErrorBoundary>
    )
  })}</>
}
