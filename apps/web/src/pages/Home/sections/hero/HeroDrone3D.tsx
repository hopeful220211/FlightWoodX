import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

const MODEL_PATH = '/models/mainboards/core_hub_01.glb'
const STATIC_FALLBACK = '/resource/picture/flight_png/untitled.297.png'

function DroneModel() {
  const { scene } = useGLTF(MODEL_PATH)
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    if (!groupRef.current) return
    // Center the model
    const box = new THREE.Box3().setFromObject(groupRef.current)
    const center = box.getCenter(new THREE.Vector3())
    groupRef.current.position.sub(center)
  }, [scene])

  // Auto-rotate when not hovered
  useFrame((_, delta) => {
    if (groupRef.current && autoRotate && !hovered) {
      groupRef.current.rotation.y += delta * 0.5 // ~30°/s
    }
  })

  const handlePointerEnter = () => {
    setHovered(true)
    setAutoRotate(false)
    if (idleTimer.current) clearTimeout(idleTimer.current)
  }

  const handlePointerLeave = () => {
    setHovered(false)
    idleTimer.current = setTimeout(() => setAutoRotate(true), 2000)
  }

  return (
    <group
      ref={groupRef}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <primitive object={scene.clone()} />
    </group>
  )
}

function StaticFallback() {
  return (
    <img
      src={STATIC_FALLBACK}
      alt="木质无人机"
      className="h-auto w-full drop-shadow-2xl animate-float"
      loading="eager"
    />
  )
}

export function HeroDrone3D() {
  const [use3D, setUse3D] = useState(true)

  useEffect(() => {
    // Performance fallback
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4) {
      setUse3D(false)
    }
    // Reduced motion fallback
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      setUse3D(false)
    }
  }, [])

  if (!use3D) {
    return <StaticFallback />
  }

  return (
    <div className="w-full h-full min-h-[300px]">
      <Canvas
        camera={{ position: [0.3, 0.2, 0.3], fov: 45, near: 0.01, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1.2} />
        <directionalLight position={[3, 3, 2]} intensity={1.8} color="#F5E6D3" />
        <directionalLight position={[-2, 1, -1]} intensity={0.5} />

        <Suspense fallback={null}>
          <DroneModel />
        </Suspense>

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>
    </div>
  )
}
