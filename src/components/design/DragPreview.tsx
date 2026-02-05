// src/components/design/DragPreview.tsx
import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface DragPreviewProps {
  modelUrl: string
  position: { x: number; y: number }
  size?: number
}

function Model({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl)
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!groupRef.current) return

    // 计算模型的边界盒
    const box = new THREE.Box3().setFromObject(groupRef.current)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // 居中模型
    groupRef.current.position.sub(center)

    // 计算合适的相机距离以显示完整模型
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.5 // 1.5 是安全系数

    // 设置相机位置以 45 度角观察
    const distance = Math.max(cameraZ, maxDim * 2)
    camera.position.set(distance * 0.5, distance * 0.4, distance * 0.5)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [scene, camera])

  return (
    <group ref={groupRef}>
      <primitive object={scene.clone()} />
    </group>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.05, 0.05, 0.05]} />
      <meshStandardMaterial color="#D4A574" wireframe />
    </mesh>
  )
}

export function DragPreview({ modelUrl, position, size = 140 }: DragPreviewProps) {
  // 检查是否为有效模型
  const isValidModel = modelUrl && !modelUrl.includes('placeholder')

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x - size / 2,
        top: position.y - size / 2,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: 0.8,
        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
      }}
    >
      {isValidModel ? (
        <Canvas
          camera={{
            position: [1, 0.8, 1],
            fov: 50,
            near: 0.01,
            far: 100,
          }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent', pointerEvents: 'none' }}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 3, 3]} intensity={2} />
          <directionalLight position={[-2, 2, -2]} intensity={0.8} />

          <Suspense fallback={<LoadingFallback />}>
            <Model modelUrl={modelUrl} />
          </Suspense>
        </Canvas>
      ) : (
        <div className="w-full h-full bg-wood-200/80 dark:bg-slate-700/80 rounded-xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-wood-400 rounded" />
        </div>
      )}
    </div>
  )
}
