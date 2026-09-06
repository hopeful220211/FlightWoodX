import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle, Component } from 'react'
import type { ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Design } from '../../types/design'
import { partsData } from '../../data/parts'

/** Resource failures stay visible in previews and can be retried without losing the design. */
class PartMeshBoundary extends Component<{ children: ReactNode; partId: string; modelUrl: string }, { hasError: boolean }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(err: Error) { console.warn(`[AssembledDrone] Failed to load ${this.props.partId}:`, err.message) }
  render() { return this.state.hasError ? <Html center><div role="alert" className="min-w-40 rounded-lg border border-red-200 bg-white p-3 text-center text-xs text-red-700 shadow">
    零件模型加载失败：{this.props.partId}
    <button className="mt-2 block w-full underline" onClick={() => { useGLTF.clear(this.props.modelUrl); this.setState({ hasError: false }) }}>重试</button>
  </div></Html> : this.props.children }
}

function PartMesh({ modelUrl, position, rotation, scale }: {
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const { scene } = useGLTF(modelUrl, false)
  const cloned = useMemo(() => scene.clone(true), [scene])
  return <group position={position} rotation={rotation} scale={scale}><primitive object={cloned} /></group>
}

interface AssembledDroneProps {
  parts: Design['parts']
  autoRotate?: boolean
  autoRotateSpeed?: number
  idleHover?: boolean
}

export interface AssembledDroneRef {
  group: THREE.Group | null
}

/**
 * Renders all parts of a design as a single assembled group.
 * Supports auto-rotation (pause on hover) and idle hover animation.
 */
export const AssembledDrone = forwardRef<AssembledDroneRef, AssembledDroneProps>(
  function AssembledDrone({ parts, autoRotate = true, autoRotateSpeed = 0.52, idleHover = false }, ref) {
    const groupRef = useRef<THREE.Group>(null)
    const [hovered, setHovered] = useState(false)
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const [rotating, setRotating] = useState(autoRotate)
    useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current) }, [])

    useImperativeHandle(ref, () => ({ group: groupRef.current }), [])

    useFrame((state, delta) => {
      if (!groupRef.current) return

      // Auto-rotate
      if (rotating && !hovered) {
        groupRef.current.rotation.y += delta * autoRotateSpeed
      }

      // Idle hover bob
      if (idleHover) {
        const t = state.clock.elapsedTime
        groupRef.current.position.y = Math.sin(t * 2) * 0.02
      }
    })

    const handlePointerEnter = () => {
      setHovered(true)
      setRotating(false)
      if (idleTimer.current) clearTimeout(idleTimer.current)
    }

    const handlePointerLeave = () => {
      setHovered(false)
      if (autoRotate) {
        idleTimer.current = setTimeout(() => setRotating(true), 2000)
      }
    }

    return (
      <group ref={groupRef} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
        {parts.map(inst => {
          const partData = partsData.find(p => p.id === inst.partId)
          if (!partData) return <Html center key={inst.instanceId}><p role="alert" className="rounded bg-white p-2 text-xs text-red-700">无法读取零件：{inst.partId}</p></Html>
          return (
            <PartMeshBoundary key={`${inst.instanceId}:${partData.modelUrl}`} partId={inst.partId} modelUrl={partData.modelUrl}>
              <PartMesh
                modelUrl={partData.modelUrl}
                position={inst.position}
                rotation={inst.rotation}
                scale={inst.scale}
              />
            </PartMeshBoundary>
          )
        })}
      </group>
    )
  },
)
