// 设计作品的 3D 预览组件（静态显示）
import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Design } from '../../types/design'
import { partsData } from '../../data/parts'

interface DesignPreview3DProps {
  design: Design
  size?: number
}

function DesignScene({ design }: { design: Design }) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!groupRef.current) return

    // 计算整个设计的边界盒
    const box = new THREE.Box3().setFromObject(groupRef.current)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    // 居中设计
    groupRef.current.position.sub(center)

    // 计算合适的相机距离
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.5

    const distance = Math.max(cameraZ, maxDim * 2)
    camera.position.set(distance * 0.6, distance * 0.4, distance * 0.6)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [design, camera])

  return (
    <group ref={groupRef}>
      {design.parts.map((instance) => {
        const partData = partsData.find((p) => p.id === instance.partId)
        if (!partData) return null
        return (
          <PartModel
            key={instance.instanceId}
            modelUrl={partData.modelUrl}
            position={instance.position}
            rotation={instance.rotation}
            scale={instance.scale || [1, 1, 1]}
          />
        )
      })}
    </group>
  )
}

function PartModel({
  modelUrl,
  position,
  rotation,
  scale,
}: {
  modelUrl: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
}) {
  const { scene } = useGLTF(modelUrl)
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={scene.clone()} />
    </group>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial color="#D4A574" wireframe />
    </mesh>
  )
}

export function DesignPreview3D({ design, size = 400 }: DesignPreview3DProps) {
  // 如果设计没有零件，显示占位符
  if (!design.parts || design.parts.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-wood-100 dark:bg-slate-800"
        style={{ width: size, height: size }}
      >
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="text-sm">暂无零件</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: size, height: size }}>
      <Canvas
        camera={{
          position: [2, 1.5, 2],
          fov: 50,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        {/* 背景色 */}
        <color attach="background" args={['#f8f9fa']} />

        {/* 光照 */}
        <ambientLight intensity={1.8} />
        <directionalLight position={[5, 5, 5]} intensity={2.5} />
        <directionalLight position={[-3, 3, -3]} intensity={1.2} />

        <Suspense fallback={<LoadingFallback />}>
          <DesignScene design={design} />
        </Suspense>
      </Canvas>
    </div>
  )
}
