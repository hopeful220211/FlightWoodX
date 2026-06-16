// 设计作品的 3D 预览组件（静态显示）
import { Suspense, useEffect, useRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { Design } from '../../types/design'
import { partsData } from '../../data/parts'

interface DesignPreview3DProps {
  design: Design
  size?: number
  /** 填满父容器（h-full w-full）而非固定 size 方形——用于响应式预览卡。 */
  fill?: boolean
  /** GLB 全部加载并取景稳定后，抓取当前画面（webp Blob）回调一次——用于生成项目封面。 */
  onSnapshot?: (blob: Blob) => void
}

// 截图组件：放在 DesignScene 内（Suspense 之下），渲染到这里即表示 GLB 已全部加载；
// 再等几帧让 FitToMeshes 的相机拟合稳定后，抓一帧画布（preserveDrawingBuffer 保证可读）。
function SnapshotOnReady({ onSnapshot, trigger }: { onSnapshot?: (blob: Blob) => void; trigger: number }) {
  const gl = useThree((s) => s.gl)
  const fired = useRef(false)
  const frames = useRef(0)
  useEffect(() => {
    fired.current = false
    frames.current = 0
  }, [trigger])
  useFrame(() => {
    if (!onSnapshot || fired.current) return
    frames.current += 1
    if (frames.current < 6) return
    fired.current = true
    gl.domElement.toBlob(
      (blob) => {
        if (blob) onSnapshot(blob)
      },
      'image/webp',
      0.85,
    )
  })
  return null
}

// 相机自适应：GLB 全部加载完成后（由外层 Suspense 保证）按"网格几何体"的包围盒取景。
// 只统计 Mesh，忽略 GLB 里可能夹带的相机 / 灯光 / 空节点——否则包围盒被撑大，
// 机身会在预览里又小又偏（一次性 useEffect 在空组上算距离也是同样的病根）。
function FitToMeshes({ groupRef, trigger }: { groupRef: RefObject<THREE.Group | null>; trigger: number }) {
  const { camera } = useThree()
  useEffect(() => {
    if (!groupRef.current) return
    // 先归零，保证重复拟合时不会被上一次的居中偏移叠加
    groupRef.current.position.set(0, 0, 0)
    groupRef.current.updateWorldMatrix(true, true)

    const box = new THREE.Box3()
    let has = false
    groupRef.current.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh && m.geometry) {
        box.expandByObject(m)
        has = true
      }
    })
    if (!has || box.isEmpty()) return

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)

    // 居中到原点
    groupRef.current.position.set(-center.x, -center.y, -center.z)

    // 取景距离：让机身约占画面 ~65%，留少量呼吸空间（机位方向向量模长约 0.94）
    const fov = (camera as THREE.PerspectiveCamera).fov * (Math.PI / 180)
    const distance = (maxDim / 2 / Math.tan(fov / 2)) * 1.7
    camera.position.set(distance * 0.6, distance * 0.4, distance * 0.6)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [groupRef, trigger, camera])
  return null
}

function DesignScene({ design, onSnapshot }: { design: Design; onSnapshot?: (blob: Blob) => void }) {
  const groupRef = useRef<THREE.Group>(null)
  return (
    <>
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
      <FitToMeshes groupRef={groupRef} trigger={design.parts.length} />
      <SnapshotOnReady onSnapshot={onSnapshot} trigger={design.parts.length} />
    </>
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

export function DesignPreview3D({ design, size = 400, fill = false, onSnapshot }: DesignPreview3DProps) {
  const wrapClass = fill ? 'h-full w-full' : ''
  const wrapStyle = fill ? undefined : { width: size, height: size }

  // 如果设计没有零件，显示占位符
  if (!design.parts || design.parts.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-wood-100 dark:bg-slate-800 ${wrapClass}`}
        style={wrapStyle}
      >
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="text-sm">暂无零件</div>
        </div>
      </div>
    )
  }

  return (
    <div className={wrapClass} style={wrapStyle}>
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
          <DesignScene design={design} onSnapshot={onSnapshot} />
        </Suspense>
      </Canvas>
    </div>
  )
}
