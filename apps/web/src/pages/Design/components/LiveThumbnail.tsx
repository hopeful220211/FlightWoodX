// src/pages/Design/components/LiveThumbnail.tsx
import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url, false)
  const ref = useRef<THREE.Group>(null)

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.01 // 保持Y轴旋转，展示不同侧面
      ref.current.rotation.x = 0.2 // 稍微倾斜一点，增加立体感
    }
  })

  return <primitive ref={ref} object={scene} />
}

export function LiveThumbnail({ modelUrl }: { modelUrl: string }) {
  return (
    <Canvas dpr={[1, 2]} shadows camera={{ fov: 45, position: [0, 0.5, 3] }}>
      {/* 简化灯光，避免使用 Stage/Svg 等额外对象导致 R3F 报错 */}
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={1.2} />
      <Model url={modelUrl} />
    </Canvas>
  )
}
