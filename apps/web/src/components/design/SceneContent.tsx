import { useDesignStore } from '../../stores/designStore'
import { partsData } from '../../data/parts'
import { GLBPart } from './GLBPart'
import { PartErrorBoundary } from './PartErrorBoundary'
import { CustomAssemblyPart } from '../../features/partStudio/CustomAssemblyPart'
import { Html } from '@react-three/drei'

export function SceneContent() {
  const activeDesign = useDesignStore(state => state.getActiveDesign())
  const isDragging = useDesignStore(state => !!state.draggingPartId)

  return <>{activeDesign?.parts.map(instance => {
    if (instance.source) return <PartErrorBoundary key={instance.instanceId} partId={instance.partId}><CustomAssemblyPart instance={instance} interactive /></PartErrorBoundary>
    const partData = partsData.find(p => p.id === instance.partId)
    if (!partData) return <Html key={instance.instanceId} position={instance.position}><p role="alert" className="rounded bg-white p-2 text-xs text-red-700">无法读取零件：{instance.partId}；引用仍保留</p></Html>
    return (
      <PartErrorBoundary key={instance.instanceId} partId={instance.partId}>
        <GLBPart instance={instance} partData={partData} dimmed={isDragging} />
      </PartErrorBoundary>
    )
  })}</>
}
