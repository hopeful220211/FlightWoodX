import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { ScrollReveal } from '../../components/common/ScrollReveal'
import type { Design } from '../../types/design'
import { partsData } from '../../data/parts'
import { useAuthStore } from '../../stores/authStore'

function AssembledModel({ parts }: { parts: Design['parts'] }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)

  useFrame((_, delta) => {
    if (groupRef.current && autoRotate && !hovered) {
      groupRef.current.rotation.y += delta * 0.52
    }
  })

  const handlePointerEnter = () => { setHovered(true); setAutoRotate(false); if (idleTimer.current) clearTimeout(idleTimer.current) }
  const handlePointerLeave = () => { setHovered(false); idleTimer.current = setTimeout(() => setAutoRotate(true), 2000) }

  return (
    <group ref={groupRef} onPointerEnter={handlePointerEnter} onPointerLeave={handlePointerLeave}>
      {parts.map(inst => {
        const partData = partsData.find(p => p.id === inst.partId)
        if (!partData) return null
        return <PartMesh key={inst.instanceId} modelUrl={partData.modelUrl} position={inst.position} rotation={inst.rotation} />
      })}
    </group>
  )
}

function PartMesh({ modelUrl, position, rotation }: { modelUrl: string; position: [number, number, number]; rotation: [number, number, number] }) {
  const { scene } = useGLTF(modelUrl)
  const cloned = scene.clone(true)
  return (
    <primitive object={cloned} position={position} rotation={rotation} />
  )
}

interface HeroSectionProps {
  design: Design
}

export function ExportHeroSection({ design }: HeroSectionProps) {
  const user = useAuthStore(s => s.user)
  const title = design.name ? `看，这是你设计的「${design.name}」！` : '看，这是你设计的飞机！'
  const date = new Date(design.updatedAt).toLocaleDateString('zh-CN')

  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-5xl px-4 text-center">
        <ScrollReveal>
          <h1 className="font-display text-3xl lg:text-[52px] font-semibold text-ink-900 leading-tight">
            {title}
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="mt-8 mx-auto max-w-3xl h-[320px] lg:h-[480px] bg-paper-100 rounded-lg overflow-hidden">
            <Canvas
              camera={{ position: [0.4, 0.3, 0.4], fov: 45, near: 0.01, far: 100 }}
              gl={{ antialias: true, alpha: true }}
              dpr={[1, 2]}
            >
              <ambientLight intensity={1.2} />
              <directionalLight position={[3, 3, 2]} intensity={1.8} color="#F5E6D3" />
              <directionalLight position={[-2, 1, -1]} intensity={0.5} />
              <Suspense fallback={null}>
                <AssembledModel parts={design.parts} />
              </Suspense>
              <OrbitControls enableZoom={false} enablePan={false} />
            </Canvas>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <p className="mt-6 text-base text-ink-600">
            由 {user?.username ?? '设计师'} · {date} 设计
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
