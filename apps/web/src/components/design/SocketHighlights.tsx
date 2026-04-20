// src/components/design/SocketHighlights.tsx
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useDesignStore } from '../../stores/designStore'
import { partsData } from '../../data/parts'
import { getCachedPartConnectors } from '../../hooks/usePartConnectors'

/**
 * 检查两个零件类别之间是否允许连接
 */
function isConnectionAllowed(childCategory: string, parentCategory: string): boolean {
  // 移除所有连接限制，允许任意零件之间连接
  return true
}

interface SocketInfo {
  instanceId: string
  socketId: string
  worldPosition: THREE.Vector3
}

export function SocketHighlights() {
  const draggingPartId = useDesignStore((state) => state.draggingPartId)
  const activeDesign = useDesignStore((state) => state.getActiveDesign())
  const highlightedSocket = useDesignStore((state) => state.highlightedSocket)

  // 计算所有可用的插座位置
  const availableSockets = useMemo<SocketInfo[]>(() => {
    if (!draggingPartId || !activeDesign) return []

    const draggingPart = partsData.find((p) => p.id === draggingPartId)
    if (!draggingPart) return []

    // 检查是否是第一个机身（第一个机身不需要连接点）
    if (draggingPart.category === 'HUB') {
      const existingHub = activeDesign.parts.find((inst) => {
        const p = partsData.find((pd) => pd.id === inst.partId)
        return p?.category === 'HUB'
      })

      if (!existingHub) {
        // 第一个机身不需要连接点
        return []
      }
      // 第二个机身需要显示连接点，继续执行
    }

    // 查找拖拽零件的连接器（优先 plug，如果没有则用 socket）
    const draggingConnectors = getCachedPartConnectors(draggingPart.modelUrl)
    const draggingPlugConnector = draggingConnectors.find((c) => c.type === 'plug')
    const draggingSocketConnector = draggingConnectors.find((c) => c.type === 'socket')
    const draggingConnector = draggingPlugConnector || draggingSocketConnector

    if (!draggingConnector) return []

    // 计算已占用的插座
    const occupiedSockets = new Set<string>()
    for (const inst of activeDesign.parts) {
      const at = inst.attachedTo
      if (at?.parentInstanceId && at.parentConnectorId) {
        occupiedSockets.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
      }
    }

    const sockets: SocketInfo[] = []

    // 遍历场景中的所有零件，找出可用的连接点（socket 和 plug）
    for (const inst of activeDesign.parts) {
      const partData = partsData.find((p) => p.id === inst.partId)
      if (!partData) continue

      // 检查连接规则
      if (!isConnectionAllowed(draggingPart.category, partData.category)) {
        continue
      }

      const connectors = getCachedPartConnectors(partData.modelUrl)

      // 根据拖拽连接器类型过滤目标连接点
      // - 如果拖拽的是 plug：可以连接到 socket 或 plug
      // - 如果拖拽的是 socket：只能连接到 plug（禁止 socket-to-socket）
      const partConnectors = connectors.filter((c) => {
        if (draggingConnector.type === 'plug') {
          // plug 可以连接到 socket 或 plug
          return c.type === 'socket' || c.type === 'plug'
        } else {
          // socket 只能连接到 plug
          return c.type === 'plug'
        }
      })

      const instPos = new THREE.Vector3(...inst.position)
      const instQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...inst.rotation))

      for (const connector of partConnectors) {
        const key = `${inst.instanceId}::${connector.id}`
        if (occupiedSockets.has(key)) continue

        // 计算连接点的世界坐标
        const worldPos = connector.position.clone().applyQuaternion(instQuat).add(instPos)
        sockets.push({
          instanceId: inst.instanceId,
          socketId: connector.id,
          worldPosition: worldPos,
        })
      }
    }

    return sockets
  }, [draggingPartId, activeDesign])

  if (!draggingPartId || availableSockets.length === 0) {
    return null
  }

  return (
    <group>
      {availableSockets.map((socket) => {
        const isHighlighted =
          highlightedSocket?.instanceId === socket.instanceId &&
          highlightedSocket?.socketId === socket.socketId

        return (
          <SocketIndicator
            key={`${socket.instanceId}-${socket.socketId}`}
            position={socket.worldPosition}
            isHighlighted={isHighlighted}
          />
        )
      })}
    </group>
  )
}

interface SocketIndicatorProps {
  position: THREE.Vector3
  isHighlighted: boolean
}

function SocketIndicator({ position, isHighlighted }: SocketIndicatorProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const ringMaterialRef = useRef<THREE.MeshBasicMaterial>(null)

  // 闪烁动画
  useFrame((state) => {
    if (!materialRef.current) return

    const time = state.clock.getElapsedTime()

    if (isHighlighted) {
      // 高亮状态：稳定发光，不闪烁
      materialRef.current.emissive.setHex(0x00ff88)
      materialRef.current.emissiveIntensity = 2
      materialRef.current.opacity = 1

      // 外圈旋转动画
      if (ringRef.current) {
        ringRef.current.rotation.z = time * 2
        ringRef.current.visible = true
      }
      if (ringMaterialRef.current) {
        ringMaterialRef.current.opacity = 0.8
      }
    } else {
      // 普通状态：闪烁动画
      const pulse = (Math.sin(time * 4) + 1) / 2 // 0 to 1
      materialRef.current.emissive.setHex(0xffaa00)
      materialRef.current.emissiveIntensity = 0.5 + pulse * 1.5
      materialRef.current.opacity = 0.4 + pulse * 0.4

      // 隐藏外圈
      if (ringRef.current) {
        ringRef.current.visible = false
      }
    }

    // 高亮时放大
    if (meshRef.current) {
      const targetScale = isHighlighted ? 1.5 : 1
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2)
    }
  })

  return (
    <group position={position}>
      {/* 核心球体 */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial
          ref={materialRef}
          color={isHighlighted ? '#00ff88' : '#ffaa00'}
          emissive={isHighlighted ? '#00ff88' : '#ffaa00'}
          emissiveIntensity={1}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </mesh>

      {/* 高亮时的外圈 */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.025, 0.035, 32]} />
        <meshBasicMaterial
          ref={ringMaterialRef}
          color="#00ff88"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
