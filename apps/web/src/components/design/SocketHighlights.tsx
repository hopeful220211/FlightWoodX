/**
 * SocketHighlights — 4-state snap point visualization system.
 *
 * States:
 *   hidden    — incompatible with dragged part (not rendered)
 *   available — compatible, accent-sky pulse
 *   nearby    — cursor within 0.3 units, accent-gold glow
 *   snapped   — cursor within 0.1 units, accent-leaf solid + lock
 */
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDesignStore } from '../../stores/designStore'
import { partsData } from '../../data/parts'
import { getCachedPartConnectors } from '../../hooks/usePartConnectors'
import { isConnectionAllowed } from '../../utils/connectionRules'

// Magnetic snap thresholds (world units)
const NEARBY_THRESHOLD = 0.3   // start attraction
const SNAP_THRESHOLD = 0.1     // lock on
const BREAK_THRESHOLD = 0.4    // break lock

type SnapState = 'available' | 'nearby' | 'snapped'

interface SocketInfo {
  instanceId: string
  socketId: string
  worldPosition: THREE.Vector3
}

export function SocketHighlights() {
  const draggingPartId = useDesignStore((state) => state.draggingPartId)
  const activeDesign = useDesignStore((state) => state.getActiveDesign())
  const highlightedSocket = useDesignStore((state) => state.highlightedSocket)
  const { raycaster, camera, pointer } = useThree()

  // Compute available sockets (category-filtered, unoccupied)
  const availableSockets = useMemo<SocketInfo[]>(() => {
    if (!draggingPartId || !activeDesign) return []

    const draggingPart = partsData.find((p) => p.id === draggingPartId)
    if (!draggingPart) return []

    // First mainboard doesn't need snap points
    if (draggingPart.category === 'mainboard') {
      const hasMainboard = activeDesign.parts.some((inst) => {
        const p = partsData.find((pd) => pd.id === inst.partId)
        return p?.category === 'mainboard'
      })
      if (!hasMainboard) return []
    }

    const draggingConnectors = getCachedPartConnectors(draggingPart.modelUrl)
    const draggingConnector = draggingConnectors.find((c) => c.type === 'plug') || draggingConnectors.find((c) => c.type === 'socket')
    if (!draggingConnector) return []

    const occupiedSockets = new Set<string>()
    for (const inst of activeDesign.parts) {
      const at = inst.attachedTo
      if (at?.parentInstanceId && at.parentConnectorId) {
        occupiedSockets.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
      }
    }

    const sockets: SocketInfo[] = []

    for (const inst of activeDesign.parts) {
      const partData = partsData.find((p) => p.id === inst.partId)
      if (!partData) continue

      if (!isConnectionAllowed(draggingPart.category, partData.category)) continue

      const connectors = getCachedPartConnectors(partData.modelUrl)
      const filtered = connectors.filter((c) => {
        if (draggingConnector.type === 'plug') return c.type === 'socket' || c.type === 'plug'
        return c.type === 'plug'
      })

      const instPos = new THREE.Vector3(...inst.position)
      const instQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...inst.rotation))

      for (const conn of filtered) {
        const key = `${inst.instanceId}::${conn.id}`
        if (occupiedSockets.has(key)) continue
        const worldPos = conn.position.clone().applyQuaternion(instQuat).add(instPos)
        sockets.push({ instanceId: inst.instanceId, socketId: conn.id, worldPosition: worldPos })
      }
    }

    return sockets
  }, [draggingPartId, activeDesign])

  if (!draggingPartId || availableSockets.length === 0) return null

  return (
    <group>
      {availableSockets.map((socket) => {
        const isThis =
          highlightedSocket?.instanceId === socket.instanceId &&
          highlightedSocket?.socketId === socket.socketId

        const snapState: SnapState = isThis
          ? (highlightedSocket?.proximity ?? 'snapped')
          : 'available'

        return (
          <SocketIndicator4State
            key={`${socket.instanceId}-${socket.socketId}`}
            position={socket.worldPosition}
            state={snapState}
          />
        )
      })}
    </group>
  )
}

// ============= 4-State Visual Indicator =============

const COLORS = {
  available: { main: 0x7DB8D9, emissive: 0x7DB8D9 },  // accent-sky
  nearby: { main: 0xD4A74A, emissive: 0xD4A74A },       // accent-gold
  snapped: { main: 0x8FB88F, emissive: 0x8FB88F },      // accent-leaf
}

interface SocketIndicator4StateProps {
  position: THREE.Vector3
  state: SnapState
}

function SocketIndicator4State({ position, state }: SocketIndicator4StateProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const ringMatRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (!matRef.current || !meshRef.current) return
    const t = clock.getElapsedTime()
    const colors = COLORS[state]

    matRef.current.emissive.setHex(colors.emissive)

    if (state === 'snapped') {
      // Solid green, full opacity, slight scale
      matRef.current.emissiveIntensity = 1.8
      matRef.current.opacity = 1
      meshRef.current.scale.lerp(new THREE.Vector3(1.4, 1.4, 1.4), 0.2)
      if (ringRef.current) {
        ringRef.current.visible = true
        ringRef.current.rotation.z = t * 2
      }
      if (ringMatRef.current) ringMatRef.current.opacity = 0.7
    } else if (state === 'nearby') {
      // Gold glow, brighter
      const pulse = (Math.sin(t * 5) + 1) / 2
      matRef.current.emissiveIntensity = 1.0 + pulse * 0.8
      matRef.current.opacity = 0.8 + pulse * 0.2
      meshRef.current.scale.lerp(new THREE.Vector3(1.2, 1.2, 1.2), 0.15)
      if (ringRef.current) ringRef.current.visible = false
    } else {
      // Available: gentle sky-blue pulse
      const pulse = (Math.sin(t * 3) + 1) / 2
      matRef.current.emissiveIntensity = 0.3 + pulse * 0.5
      matRef.current.opacity = 0.35 + pulse * 0.2
      meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1)
      if (ringRef.current) ringRef.current.visible = false
    }
  })

  const colors = COLORS[state]
  const colorHex = `#${colors.main.toString(16).padStart(6, '0')}`

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.006, 14, 14]} />
        <meshStandardMaterial
          ref={matRef}
          color={colorHex}
          emissive={colorHex}
          emissiveIntensity={0.5}
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.009, 0.013, 24]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={colorHex}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
