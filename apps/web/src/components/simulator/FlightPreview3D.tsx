/**
 * FlightPreview3D — 试飞场景的静态预览（非交互）。
 *
 * 复用仿真器同款视觉：浅蓝渐变天空 + 网格地面 + 低多边形无人机，
 * 但固定机位、无 OrbitControls，仅渲染一帧悬停姿态，作为项目详情页的试飞预览。
 * 真正的飞行仿真在 /simulator（FlightScene，由 Telemetry 驱动）。
 */
import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'

const ARMS: [number, number][] = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]

function Drone() {
  return (
    <group position={[0, 0.55, 0]}>
      {/* 机身 */}
      <mesh>
        <boxGeometry args={[0.3, 0.08, 0.3]} />
        <meshStandardMaterial color="#b8864f" />
      </mesh>
      {ARMS.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x * 0.18, 0.02, z * 0.18]}>
            <cylinderGeometry args={[0.015, 0.015, 0.25, 8]} />
            <meshStandardMaterial color="#a67038" />
          </mesh>
          {/* 桨盘 */}
          <mesh position={[x * 0.18, 0.06, z * 0.18]}>
            <cylinderGeometry args={[0.08, 0.08, 0.005, 16]} />
            <meshStandardMaterial color="#4AA3F0" transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* 机头指示 */}
      <mesh position={[0, 0.05, 0.18]}>
        <coneGeometry args={[0.03, 0.06, 8]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    </group>
  )
}

export function FlightPreview3D() {
  return (
    <Canvas
      camera={{ position: [2.2, 1.7, 2.4], fov: 45, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      style={{ background: 'linear-gradient(180deg, #d6ecff 0%, #f0f7ff 100%)' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[6, 12, 8]} intensity={1.1} />
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#b9dbfe"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#4AA3F0"
        fadeDistance={16}
        infiniteGrid
      />
      {/* 起飞标记 */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.15, 32]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
      </mesh>
      <Drone />
    </Canvas>
  )
}
