import { useRef, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { AssembledDrone } from '../../components/design/AssembledDrone'
import type { AssembledDroneRef } from '../../components/design/AssembledDrone'
import type { Design } from '../../types/design'
import { createInitialState, updatePhysics, getVisualTilt } from './flightPhysics'
import type { FlightInput } from './flightPhysics'

interface FlightControllerProps {
  parts: Design['parts']
  inputRef: React.RefObject<FlightInput | null>
  onAltitudeChange?: (altitude: number) => void
}

const TILT_LERP = 0.08 // smoothing for visual tilt

export function FlightController({ parts, inputRef, onAltitudeChange }: FlightControllerProps) {
  const droneRef = useRef<AssembledDroneRef>(null)
  const stateRef = useRef(createInitialState())
  const currentPitch = useRef(0)
  const currentRoll = useRef(0)

  useFrame((_, dt) => {
    const state = stateRef.current
    const input: FlightInput = inputRef.current ?? { leftX: 0, leftY: 0, rightX: 0, rightY: 0 }

    // Advance physics
    updatePhysics(state, input, dt)

    // Get visual tilt targets
    const { pitch, roll } = getVisualTilt(state)

    // Smooth tilt
    currentPitch.current = THREE.MathUtils.lerp(currentPitch.current, pitch, TILT_LERP)
    currentRoll.current = THREE.MathUtils.lerp(currentRoll.current, roll, TILT_LERP)

    // Write altitude for HUD through the owner callback; child components do not mutate parent refs.
    onAltitudeChange?.(state.position.y)

    // Apply to 3D group
    const group = droneRef.current?.group
    if (group) {
      group.position.copy(state.position)
      group.rotation.set(currentPitch.current, state.rotationY, currentRoll.current)
    }
  })

  return (
    <Suspense fallback={null}>
      <AssembledDrone
        ref={droneRef}
        parts={parts}
        autoRotate={false}
        idleHover={false}
      />
    </Suspense>
  )
}
