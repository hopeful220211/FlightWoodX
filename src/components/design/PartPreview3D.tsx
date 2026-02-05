// src/components/design/PartPreview3D.tsx
import React, { Suspense, useRef, useState, useEffect, Component } from 'react'
import type { ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center } from '@react-three/drei'
import * as THREE from 'three'

interface PartPreview3DProps {
  modelUrl: string
  autoRotate?: boolean
  size?: number
}

// 错误边界组件
class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PartPreview3D Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

function Model({ modelUrl, autoRotate = true }: { modelUrl: string; autoRotate?: boolean }) {
  const { scene } = useGLTF(modelUrl)
  const groupRef = useRef<THREE.Group>(null)

  // 自动旋转
  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <Center>
      <group ref={groupRef}>
        <primitive object={scene.clone()} />
      </group>
    </Center>
  )
}

function LoadingFallback() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[0.03, 0.03, 0.03]} />
      <meshStandardMaterial color="#D4A574" wireframe />
    </mesh>
  )
}

// 占位符预览
function FallbackPreview({ size }: { size?: number }) {
  const containerStyle = size
    ? { width: size, height: size }
    : { width: '100%', height: '100%' }

  return (
    <div
      style={containerStyle}
      className="rounded-xl overflow-hidden bg-gradient-to-br from-wood-50 to-wood-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center"
    >
      <div className="w-8 h-8 border-2 border-wood-300 border-dashed rounded animate-pulse" />
    </div>
  )
}

export function PartPreview3D({ modelUrl, autoRotate = true, size }: PartPreview3DProps) {
  const [isClient, setIsClient] = useState(false)

  // 确保只在客户端渲染
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 检查 modelUrl 是否有效（跳过 placeholder 模型）
  const isValidModel = modelUrl && !modelUrl.includes('placeholder')

  if (!isClient || !isValidModel) {
    return <FallbackPreview size={size} />
  }

  // 使用 size 或 100% 填充
  const containerStyle = size
    ? { width: size, height: size }
    : { width: '100%', height: '100%' }

  return (
    <ErrorBoundary fallback={<FallbackPreview size={size} />}>
      <div style={containerStyle} className="rounded-xl overflow-hidden bg-gradient-to-br from-wood-50 to-wood-100 dark:from-slate-800 dark:to-slate-900">
        <Canvas
          camera={{
            position: [0.4, 0.3, 0.4],
            fov: 45,
            near: 0.01,
            far: 100,
          }}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent', pointerEvents: 'none' }}
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[2, 2, 2]} intensity={1.5} />
          <directionalLight position={[-2, -1, -2]} intensity={0.5} />

          <Suspense fallback={<LoadingFallback />}>
            <Model modelUrl={modelUrl} autoRotate={autoRotate} />
          </Suspense>

          {/* 禁用所有交互，只展示自动旋转的预览 */}
        </Canvas>
      </div>
    </ErrorBoundary>
  )
}
