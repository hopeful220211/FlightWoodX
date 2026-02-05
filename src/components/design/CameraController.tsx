import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type CameraView = 'front' | 'top' | 'side' | 'reset'

interface CameraControllerProps {
  view: CameraView | null
  onViewChanged?: () => void
}

// 相机视角预设位置
const CAMERA_POSITIONS = {
  front: new THREE.Vector3(0, 0, 2),      // 正视图：从前方看
  top: new THREE.Vector3(0, 2, 0),        // 俯视图：从上方看
  side: new THREE.Vector3(2, 0, 0),       // 侧视图：从右侧看
  reset: new THREE.Vector3(0.6, 0.6, 0.8), // 默认视角
}

export function CameraController({ view, onViewChanged }: CameraControllerProps) {
  const { camera, controls } = useThree()
  const isAnimatingRef = useRef(false)

  useEffect(() => {
    if (!view || !controls || isAnimatingRef.current) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orbitControls = controls as any // OrbitControls type
    if (!orbitControls.object) return

    isAnimatingRef.current = true

    const targetPosition = CAMERA_POSITIONS[view]
    const startPosition = camera.position.clone()
    const startTime = Date.now()
    const duration = 800 // 动画持续时间（毫秒）

    // 平滑动画
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用 easeInOutCubic 缓动函数
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      // 插值计算当前位置
      camera.position.lerpVectors(startPosition, targetPosition, eased)

      // 确保相机看向原点
      camera.lookAt(0, 0, 0)

      // 更新 OrbitControls 的目标
      if (orbitControls.target) {
        orbitControls.target.set(0, 0, 0)
      }
      orbitControls.update()

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        isAnimatingRef.current = false
        onViewChanged?.()
      }
    }

    animate()
  }, [view, camera, controls, onViewChanged])

  return null
}
