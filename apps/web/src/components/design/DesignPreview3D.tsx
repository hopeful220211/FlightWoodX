// 设计作品的 3D 预览组件（静态显示）
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import { useQueryClient } from '@tanstack/react-query'
import * as THREE from 'three'
import type { Design } from '../../types/design'
import { partsData } from '../../data/parts'
import { prepareWoodScene, waitForWoodTextures } from './woodMaterial'
import { SceneLighting } from './SceneLighting'
import { CustomAssemblyPart, type CustomPartReadiness } from '../../features/partStudio/CustomAssemblyPart'
import { customAssemblyQueryKey } from '../../features/partStudio/useCustomAssemblyPart'
import { useAuthStore } from '../../stores/authStore'

interface DesignPreview3DProps {
  design: Design
  size?: number
  /** 填满父容器（h-full w-full）而非固定 size 方形——用于响应式预览卡。 */
  fill?: boolean
  /** GLB 全部加载并取景稳定后，抓取当前画面（webp Blob）回调一次——用于生成项目封面。 */
  onSnapshot?: (blob: Blob) => void
  onSnapshotError?: (error: Error) => void
}

// Suspense waits for GLBs, but the shared wood image loads independently.
// FitToMeshes runs before this effect; explicitly render after texture readiness
// so toBlob cannot capture the previous frame from a useFrame callback.
export function SnapshotOnReady({ onSnapshot, onError, trigger, canCapture }: {
  onSnapshot?: (blob: Blob) => void
  onError?: (error: Error) => void
  trigger: number | string
  canCapture?: () => boolean
}) {
  const { gl, scene, camera } = useThree()
  const token = useAuthStore(state => state.token)
  const ownerId = useAuthStore(state => state.user?.id)
  useEffect(() => {
    if (!onSnapshot) return
    let active = true
    const isCurrent = () => active && useAuthStore.getState().token === token
      && useAuthStore.getState().user?.id === ownerId && (!canCapture || canCapture())
    void waitForWoodTextures(scene).then(() => {
      if (!isCurrent()) return
      gl.render(scene, camera)
      gl.domElement.toBlob((blob) => {
        if (!isCurrent()) return
        if (blob) onSnapshot(blob)
        else onError?.(new Error('封面生成失败'))
      }, 'image/webp', 0.85)
    }).catch((error: unknown) => {
      if (isCurrent()) onError?.(error instanceof Error ? error : new Error('封面生成失败'))
    })
    return () => { active = false }
  }, [gl, scene, camera, trigger, onSnapshot, onError, canCapture, token, ownerId])
  return null
}

// 相机自适应：GLB 全部加载完成后（由外层 Suspense 保证）按"网格几何体"的包围盒取景。
// 只统计 Mesh，忽略 GLB 里可能夹带的相机 / 灯光 / 空节点——否则包围盒被撑大，
// 机身会在预览里又小又偏（一次性 useEffect 在空组上算距离也是同样的病根）。
export function FitToMeshes({ groupRef, trigger }: { groupRef: RefObject<THREE.Group | null>; trigger: number | string }) {
  const getRendererState = useThree(state => state.get)
  useEffect(() => {
    if (!groupRef.current) return
    const { camera } = getRendererState()
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
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.near = Math.max(0.00001, maxDim / 100)
      camera.far = Math.max(1, distance + maxDim * 4)
    }
    camera.updateProjectionMatrix()
  }, [groupRef, trigger, getRendererState])
  return null
}

export function DesignScene({ design, onSnapshot, onSnapshotError }: {
  design: Design
  onSnapshot?: (blob: Blob) => void
  onSnapshotError?: (error: Error) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const queryClient = useQueryClient()
  const ownerId = useAuthStore(state => state.user?.id)
  const token = useAuthStore(state => state.token)
  const [customStates, setCustomStates] = useState<Record<string, CustomPartReadiness>>({})
  const customParts = useMemo(() => design.parts.filter(instance => instance.source), [design.parts])
  const signature = `${design.id}:${design.updatedAt}:${JSON.stringify(design.parts)}`
  const onReadinessChange = useCallback((instanceId: string, next: CustomPartReadiness) => {
    setCustomStates(previous => {
      const current = previous[instanceId]
      if (current?.status === next.status && (next.status !== 'error' || (current.status === 'error' && current.error === next.error))) return previous
      return { ...previous, [instanceId]: next }
    })
  }, [])
  const sourceError = customParts.map(instance => customStates[instance.instanceId]).find(state => state?.status === 'error')
  const ready = customParts.every(instance => customStates[instance.instanceId]?.status === 'ready')
  const canCapture = useCallback(() => {
    if (useAuthStore.getState().token !== token || useAuthStore.getState().user?.id !== ownerId) return false
    return customParts.every(instance => {
      const state = queryClient.getQueryState(customAssemblyQueryKey(instance, ownerId))
      return state?.status === 'success' && state.fetchStatus === 'idle'
    })
  }, [customParts, ownerId, queryClient, token])
  useEffect(() => {
    if (sourceError?.status === 'error') onSnapshotError?.(sourceError.error)
  }, [sourceError, onSnapshotError])
  return (
    <>
      <group ref={groupRef}>
        {design.parts.map((instance) => {
          if (instance.source) return <CustomAssemblyPart key={instance.instanceId} instance={instance} onReadinessChange={onReadinessChange} />
          const partData = partsData.find((p) => p.id === instance.partId)
          if (!partData) throw new Error(`无法读取零件：${instance.partId}`)
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
      {ready && <>
        <FitToMeshes groupRef={groupRef} trigger={signature} />
        <SnapshotOnReady onSnapshot={onSnapshot} onError={onSnapshotError} trigger={signature} canCapture={canCapture} />
      </>}
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
  const { scene } = useGLTF(modelUrl, false)
  // 与编辑器一致：套用暖木色材质（强制 metalness=0），否则裸 GLB 默认材质会渲染成纯黑剪影。
  const prepared = useMemo(() => prepareWoodScene(scene), [scene])
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={prepared} />
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

class PreviewErrorBoundary extends Component<{ children: ReactNode; onError?: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { this.props.onError?.(error) }
  render() { return this.state.failed ? <Html center><p role="alert">加载失败</p></Html> : this.props.children }
}

export function DesignPreview3D({ design, size = 400, fill = false, onSnapshot, onSnapshotError }: DesignPreview3DProps) {
  const ownerId = useAuthStore(state => state.user?.id)
  const signature = `${ownerId ?? 'guest'}:${design.id}:${design.updatedAt}:${JSON.stringify(design.parts)}`
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
        {/* 浅色背景，确保抓出来的封面是浅底 + 有光木色模型，不是黑团 */}
        <color attach="background" args={['#f4f6f8']} />

        {/* 固定三点布光（与编辑器同一套），让封面有立体明暗、零件分得清 */}
        <SceneLighting />

        <PreviewErrorBoundary key={signature} onError={onSnapshotError}>
          <Suspense fallback={<LoadingFallback />}>
            <DesignScene design={design} onSnapshot={onSnapshot} onSnapshotError={onSnapshotError} />
          </Suspense>
        </PreviewErrorBoundary>
      </Canvas>
    </div>
  )
}
