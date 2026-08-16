// src/components/design/DragPreview.tsx
import { Suspense, useRef, useEffect, Component, type ReactNode } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

// 简单的错误边界组件，用于捕获拖拽预览中的错误
class DragPreviewErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error('[DragPreview] Model loading error:', error)
  }

  render() {
    if (this.state.hasError) {
      // 渲染一个简单的占位符
      return (
        <mesh>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="#ff6b6b" wireframe />
        </mesh>
      )
    }
    return this.props.children
  }
}

interface DragPreviewProps {
  modelUrl: string
  position: { x: number; y: number }
  size?: number
}

function Model({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl, false)
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)

  useEffect(() => {
    if (!groupRef.current) return

    // 应用木质材质到所有 mesh（中等原木色）
    const woodColor = new THREE.Color('#C4A882')
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          // 对所有有 color 属性的材质应用木质颜色
          if ('color' in mat && mat.color instanceof THREE.Color) {
            mat.color.lerp(woodColor, 0.7)
          }
          // 对支持 PBR 属性的材质设置物理特性
          if (mat instanceof THREE.MeshStandardMaterial ||
              mat instanceof THREE.MeshPhysicalMaterial) {
            mat.roughness = 0.82
            mat.metalness = 0
          }
          mat.needsUpdate = true
        })
      }
    })

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
            <DragPreviewErrorBoundary>
              <Model modelUrl={modelUrl} />
            </DragPreviewErrorBoundary>
          </Suspense>
        </Canvas>
      ) : (
        <div className="w-full h-full bg-wood-200/80 dark:bg-slate-700/80 rounded-lg flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-wood-400 rounded" />
        </div>
      )}
    </div>
  )
}
