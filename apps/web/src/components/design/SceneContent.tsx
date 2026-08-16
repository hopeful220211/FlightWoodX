// src/components/design/SceneContent.tsx
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDesignStore } from '../../stores/designStore'
import { partsData } from '../../data/parts'
import { GLBPart } from './GLBPart'
import { getCachedPartConnectors } from '../../hooks/usePartConnectors'
import { computeOccupiedConnectors } from '../../utils/connectionRules'
import { PartErrorBoundary } from './PartErrorBoundary'

// 幽灵模型组件（拖拽预览）- 暂时禁用
/* function GhostPart({ partId, position }: { partId: string; position: [number, number, number] }) {
  const partData = partsData.find((p) => p.id === partId)
  if (!partData) return null

  const { scene } = useGLTF(partData.modelUrl, false)

  return (
    <group position={position} scale={[2, 2, 2]}>
      <primitive object={scene.clone()}>
        <meshStandardMaterial transparent opacity={0.5} color="#00ff00" />
      </primitive>
    </group>
  )
} */

// 拖拽吸附逻辑组件
function DragSnapLogic() {
  const activeDesign = useDesignStore((state) => state.getActiveDesign())
  // const ghostPart = useDesignStore((state) => state.ghostPart)
  const highlightedSocket: { instanceId: string; socketId: string; plugId: string } | null = useDesignStore((state) => state.highlightedSocket)
  const setHighlightedSocket = useDesignStore((state) => state.setHighlightedSocket)

  useFrame(() => {
    // 当前排查阶段禁用幽灵模型逻辑：仅使用 store 的即时状态，不在组件体内声明 ghostPart 变量
    const ghostPart = useDesignStore.getState().ghostPart
    if (!ghostPart) {
      if (highlightedSocket) {
        setHighlightedSocket(null)
      }
      return
    }

    const ghostPartData = partsData.find((p) => p.id === ghostPart.partId)
    if (!ghostPartData) return

    const ghostConnectors = getCachedPartConnectors(ghostPartData.modelUrl)
    if (!ghostConnectors) return
    const ghostPlugs = ghostConnectors.filter((c) => c.type === 'plug')
    if (!ghostPlugs.length) return

    // 已占用连接点：父件被插入的卡口 + 子件用来插入的卡口，两侧都算占用
    const occupiedSockets = computeOccupiedConnectors(activeDesign?.parts ?? [])

    // 计算最近的 plug-socket 配对
    let best: { instanceId: string; socketId: string; plugId: string; distance: number } | null = null
    const maxDistance = 0.12 // 更贴近文档（示例 0.1m）

    activeDesign?.parts.forEach((instance) => {
      const partData = partsData.find((p) => p.id === instance.partId)
      if (!partData) return

      const parentConnectors = getCachedPartConnectors(partData.modelUrl)
      if (!parentConnectors) return
      const sockets = parentConnectors.filter((c) => c.type === 'socket')
      if (!sockets.length) return

      const instancePos = new THREE.Vector3(...instance.position)
      const instanceQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...instance.rotation))

      for (const socket of sockets) {
        const key = `${instance.instanceId}::${socket.id}`
        if (occupiedSockets.has(key)) continue

        const socketWorldPos = socket.position.clone().applyQuaternion(instanceQuat).add(instancePos)

        for (const plug of ghostPlugs) {
          const ghostPos = new THREE.Vector3(...ghostPart.position)
          // 目前 ghost 旋转视作 0：如需，后续可扩展 ghost rotation
          const plugWorldPos = plug.position.clone().add(ghostPos)
          const dist = plugWorldPos.distanceTo(socketWorldPos)

          if (dist <= maxDistance && (!best || dist < best.distance)) {
            best = { instanceId: instance.instanceId, socketId: socket.id, plugId: plug.id, distance: dist }
          }
        }
      }
    })

    if (best) {
      // 避免 TS 在闭包里把 best 推断成 never（与 zustand selector 组合时偶发）
      const b: { instanceId: string; socketId: string; plugId: string; distance: number } = best
      setHighlightedSocket({ instanceId: b.instanceId, socketId: b.socketId, plugId: b.plugId })
    } else if (highlightedSocket) {
      setHighlightedSocket(null)
    }
  })

  return null
}

export function SceneContent() {
  const activeDesign = useDesignStore((state) => state.getActiveDesign())
  const isDragging = useDesignStore((state) => !!state.draggingPartId)

  return (
    <>
      <DragSnapLogic />
      {activeDesign?.parts.map((instance) => {
        const partData = partsData.find((p) => p.id === instance.partId)
        if (!partData) return null
        return (
          <PartErrorBoundary key={instance.instanceId} partId={instance.partId}>
            <GLBPart instance={instance} partData={partData} dimmed={isDragging} />
          </PartErrorBoundary>
        )
      })}
      {/* 为继续排查 Svg 白屏问题，暂时注释幽灵模型渲染 */}
      {/* {useDesignStore.getState().ghostPart && (
        <GhostPart
          partId={useDesignStore.getState().ghostPart!.partId}
          position={useDesignStore.getState().ghostPart!.position}
        />
      )} */}
      {/* 为排查 Svg 白屏问题，暂时注释掉高亮插座渲染 */}
      {/* {highlightedSocket ? (
        <HighlightedSocket instanceId={highlightedSocket.instanceId} socketId={highlightedSocket.socketId} />
      ) : null} */}
    </>
  )
}
