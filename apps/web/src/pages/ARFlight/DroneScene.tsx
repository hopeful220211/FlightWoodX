import { Suspense, forwardRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { AssembledDrone } from '../../components/design/AssembledDrone'
import type { AssembledDroneRef } from '../../components/design/AssembledDrone'
import type { Design } from '../../types/design'

interface DroneSceneProps {
  parts: Design['parts']
}

/**
 * Full-screen transparent R3F Canvas with the assembled drone.
 * Camera is fixed (no OrbitControls) — drone position controlled externally.
 */
export const DroneScene = forwardRef<AssembledDroneRef, DroneSceneProps>(
  function DroneScene({ parts }, ref) {
    return (
      <div className="fixed inset-0 z-10 pointer-events-none">
        <Canvas
          camera={{ position: [0, 0.3, 0.8], fov: 50, near: 0.01, far: 100 }}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 3, 2]} intensity={1.8} color="#F5E6D3" />
          <directionalLight position={[-2, 1, -1]} intensity={0.5} />
          <Suspense fallback={null}>
            <AssembledDrone
              ref={ref}
              parts={parts}
              autoRotate={false}
              idleHover
            />
          </Suspense>
        </Canvas>
      </div>
    )
  },
)
