/**
 * FlightScene — Three.js 3D 仿真飞行场景。
 *
 * 用 @react-three/fiber 渲染：
 * - 天空渐变背景
 * - 地面网格
 * - 障碍物（圆柱）
 * - 当前作品的拼装零件；没有零件时显示指令预览模型
 * - 飞行轨迹线
 *
 * 由 SimAdapter 的 Telemetry 驱动无人机位置更新。
 */
import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Sky, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { Telemetry } from '@fwx/shared'
import type { SimObstacle } from './SimAdapter'
import type { Design } from '../types/design'
import { AssembledDrone } from '../components/design/AssembledDrone'

interface FlightSceneProps {
  telemetry: Telemetry | null
  obstacles?: SimObstacle[]
  trail?: [number, number, number][]
  ledColor?: [number, number, number]
  parts?: Design['parts']
}

/** Scale: 1 unit = 1 cm in scene */
const CM_TO_UNIT = 0.01 // render at meter scale for better Three.js defaults

function Drone({ telemetry, ledColor, parts }: Pick<FlightSceneProps, 'telemetry' | 'ledColor' | 'parts'>) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    if (!telemetry) {
      groupRef.current.position.set(0, 0, 0)
      groupRef.current.rotation.set(0, 0, 0)
      return
    }
    groupRef.current.position.set(
      telemetry.posCm[0] * CM_TO_UNIT,
      telemetry.posCm[1] * CM_TO_UNIT,
      telemetry.posCm[2] * CM_TO_UNIT,
    )
    groupRef.current.rotation.y = -(telemetry.headingDeg * Math.PI) / 180
  })

  const color = ledColor && (ledColor[0] + ledColor[1] + ledColor[2]) > 0
    ? `rgb(${ledColor[0]},${ledColor[1]},${ledColor[2]})`
    : '#4AA3F0'

  return (
    <group ref={groupRef}>
      {parts?.length ? <Suspense fallback={null}><AssembledDrone parts={parts} autoRotate={false} /></Suspense> : <>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.08, 0.3]} />
        <meshStandardMaterial color="#b8864f" />
      </mesh>
      {/* Arms */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x * 0.18, 0.02, z * 0.18]} castShadow>
            <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
            <meshStandardMaterial color="#a67038" />
          </mesh>
          {/* Rotor disc */}
          <mesh position={[x * 0.18, 0.06, z * 0.18]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.005, 16]} />
            <meshStandardMaterial color={color} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* Direction indicator (nose) */}
      <mesh position={[0, 0.05, 0.18]}>
        <coneGeometry args={[0.03, 0.06, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      </>}
    </group>
  )
}

function Obstacles({ obstacles }: { obstacles: SimObstacle[] }) {
  return (
    <>
      {obstacles.map((obs, i) => (
        <mesh
          key={i}
          position={[obs.posCm[0] * CM_TO_UNIT, 0.5, obs.posCm[2] * CM_TO_UNIT]}
          castShadow
        >
          <cylinderGeometry args={[obs.radiusCm * CM_TO_UNIT, obs.radiusCm * CM_TO_UNIT, 1, 16]} />
          <meshStandardMaterial color="#ef4444" transparent opacity={0.4} />
        </mesh>
      ))}
    </>
  )
}

function FlightTrail({ trail }: { trail: [number, number, number][] }) {
  const points = useMemo(
    () => trail.map(([x, y, z]) => [x * CM_TO_UNIT, y * CM_TO_UNIT, z * CM_TO_UNIT] as [number, number, number]),
    [trail],
  )

  if (points.length < 2) return null

  return (
    <Line
      points={points}
      color="#4AA3F0"
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  )
}

function Scene({ telemetry, obstacles = [], trail = [], ledColor, parts }: FlightSceneProps) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

      <Sky sunPosition={[100, 50, 100]} />

      {/* Ground */}
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#b9dbfe"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#4AA3F0"
        fadeDistance={25}
        infiniteGrid
      />

      {/* Start marker */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
      </mesh>

      <Obstacles obstacles={obstacles} />
      <FlightTrail trail={trail} />
      <Drone telemetry={telemetry} ledColor={ledColor} parts={parts} />

      <OrbitControls
        makeDefault
        target={[0, 0.5, 0]}
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={1}
        maxDistance={15}
      />
    </>
  )
}

export function FlightScene(props: FlightSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [3, 3, 3], fov: 50, near: 0.1, far: 100 }}
      style={{ background: 'linear-gradient(180deg, #e0efff 0%, #f0f7ff 100%)' }}
    >
      <Scene {...props} />
    </Canvas>
  )
}
