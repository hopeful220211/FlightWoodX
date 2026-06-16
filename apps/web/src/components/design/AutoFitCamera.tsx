import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useDesignStore } from '../../stores/designStore'

/**
 * 自动取景：每当零件数量变化时，把相机目标与距离对准当前装配的包围盒，
 * 让无人机始终被舒适地框在视口中央——解决「零件很小、视口看起来空空如也」。
 *
 * 包围盒从零件实例位置估算（外扩一个零件本体的尺寸），刻意**不**用 `Box3.setFromObject(scene)`，
 * 因为场景里的无限参考网格会把包围盒撑到无穷大。保持用户当前的观察方向，仅调整目标与距离。
 */
export function AutoFitCamera() {
  const { camera, controls } = useThree()
  // 仅依赖数量变化触发取景，避免每次重渲染都跳镜头
  const partCount = useDesignStore((s) => s.getActiveDesign()?.parts.length ?? 0)

  useEffect(() => {
    if (partCount === 0 || !controls) return
    const parts = useDesignStore.getState().getActiveDesign()?.parts ?? []
    if (parts.length === 0) return

    const box = new THREE.Box3()
    for (const p of parts) box.expandByPoint(new THREE.Vector3(...p.position))
    // 每个零件本体约 0.06–0.12 单位，外扩让零件完整入框
    box.expandByScalar(0.12)

    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z, 0.08)

    const persp = camera as THREE.PerspectiveCamera
    const fov = (persp.fov * Math.PI) / 180
    const dist = (maxDim / 2 / Math.tan(fov / 2)) * 2.2

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orbit = controls as any
    // 保持当前观察方向；首帧无方向时用一个舒适的 3/4 视角
    const dir = camera.position.clone().sub(orbit.target)
    if (dir.lengthSq() < 1e-8) dir.set(0.5, 0.45, 0.8)
    dir.normalize()

    orbit.target.copy(center)
    camera.position.copy(center.clone().add(dir.multiplyScalar(dist)))
    camera.lookAt(center)
    orbit.update()
  }, [partCount, camera, controls])

  return null
}
