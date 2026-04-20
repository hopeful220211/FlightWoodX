// src/components/design/PartThumbnail.tsx
// 轻量级零件缩略图组件，使用 CSS3D 渲染器避免 WebGL context 限制
import { useEffect, useRef, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js'

interface PartThumbnailProps {
  modelUrl: string
  size?: number
}

/**
 * 使用离屏 Canvas 渲染缩略图
 * 只在组件挂载时渲染一次，生成静态图片
 */
export function PartThumbnail({ modelUrl, size = 100 }: PartThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true, // 保留绘制缓冲区以便截图
    })

    renderer.setSize(size, size)
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100)
    camera.position.set(0.4, 0.3, 0.4)
    camera.lookAt(0, 0, 0)

    // 光照
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight1.position.set(2, 2, 2)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight2.position.set(-2, -1, -2)
    scene.add(directionalLight2)

    // 加载模型
    const loader = new THREE.GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        // 计算边界盒并居中
        const box = new THREE.Box3().setFromObject(gltf.scene)
        const center = box.getCenter(new THREE.Vector3())
        const size = box.getSize(new THREE.Vector3())

        gltf.scene.position.sub(center)

        // 调整相机距离以适应模型
        const maxDim = Math.max(size.x, size.y, size.z)
        const fov = camera.fov * (Math.PI / 180)
        const cameraZ = Math.abs(maxDim / Math.tan(fov / 2)) * 1.5
        const distance = Math.max(cameraZ, maxDim * 2)

        camera.position.set(distance * 0.5, distance * 0.4, distance * 0.5)
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()

        scene.add(gltf.scene)

        // 渲染单帧
        renderer.render(scene, camera)
        setIsLoading(false)

        // 清理
        renderer.dispose()
      },
      undefined,
      (error) => {
        console.error('[PartThumbnail] Failed to load model:', modelUrl, error)
        setError(true)
        setIsLoading(false)
        renderer.dispose()
      }
    )

    // Cleanup on unmount
    return () => {
      renderer.dispose()
    }
  }, [modelUrl, size])

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-gradient-to-br from-wood-100 to-wood-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center"
      >
        <span className="text-xs text-wood-600 dark:text-slate-400">加载失败</span>
      </div>
    )
  }

  return (
    <div style={{ width: size, height: size }} className="relative">
      {isLoading && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-wood-50 to-wood-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-wood-300 border-dashed rounded animate-spin" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg"
        style={{ width: size, height: size }}
      />
    </div>
  )
}
