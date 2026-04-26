import { useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Design } from '../../types/design'
import { partsData } from '../../data/parts'

function PartMesh({ modelUrl, position, rotation }: {
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
}) {
  const { scene } = useGLTF(modelUrl)
  const cloned = scene.clone(true)
  return <primitive object={cloned} position={position} rotation={rotation} />
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
          if (!partData) return null
          return (
            <PartMesh
              key={inst.instanceId}
              modelUrl={partData.modelUrl}
              position={inst.position}
              rotation={inst.rotation}
            />
          )
        })}
      </group>
    )
  },
)
