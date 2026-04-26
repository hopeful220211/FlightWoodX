import { Canvas } from '@react-three/fiber'
import { FlightController } from './FlightController'
import type { Design } from '../../types/design'
import type { FlightInput } from './flightPhysics'

interface DroneSceneProps {
  parts: Design['parts']
  inputRef: React.RefObject<FlightInput | null>
}

/**
 * Full-screen transparent R3F Canvas with flight-controlled drone.
 * Camera is fixed — drone position controlled by FlightController + physics.
 */
export function DroneScene({ parts, inputRef }: DroneSceneProps) {
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
        <FlightController parts={parts} inputRef={inputRef} />
      </Canvas>
    </div>
  )
}
