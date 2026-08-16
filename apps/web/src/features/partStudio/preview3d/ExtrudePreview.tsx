// features/partStudio/preview3d/ExtrudePreview.tsx
//
// 右侧 3D 实时预览（RFC-021 §7 "立起来"）：2D 闭合轮廓 → THREE.Shape → ExtrudeGeometry。
// 绕向校正（§2 坑①）：转到 shape 空间后强制外轮廓 CCW，否则面法线翻转/破面。
// 与 paper.js 解耦：这里只吃"点"，自己建几何（§2 坑②）。

import { useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Point2D } from '../types'
import { ensureWinding } from '../geometry/winding'

const WOOD = '#C8954C'

/** 画布坐标(y 向下) → 居中归一化的 shape 点(y 向上, 最长边约 2 单位)。 */
function normalizeToShapeSpace(outline: Point2D[]): Point2D[] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of outline) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const span = Math.max(maxX - minX, maxY - minY) || 1
  const scale = 2 / span
  // y 取负 → 翻转画布的"向下"为 3D 的"向上"
  return outline.map(([x, y]) => [(x - cx) * scale, -(y - cy) * scale] as Point2D)
}

function buildGeometry(outline: Point2D[], thickness: number): THREE.ExtrudeGeometry {
  const pts = ensureWinding(normalizeToShapeSpace(outline), true) // 外轮廓 CCW
  const shape = new THREE.Shape()
  shape.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1])
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

interface ExtrudePreviewProps {
  outline: Point2D[] | null
  /** 视觉厚度（归一化单位）。真实板厚 mm 映射在 M2 存盘时处理。 */
  thickness?: number
}

export function ExtrudePreview({ outline, thickness = 0.32 }: ExtrudePreviewProps) {
  const geometry = useMemo(() => {
    if (!outline || outline.length < 3) return null
    try {
      return buildGeometry(outline, thickness)
    } catch {
      return null
    }
  }, [outline, thickness])

  // 卸载/替换时释放上一份几何，避免显存泄漏
  useEffect(() => {
    return () => {
      geometry?.dispose()
    }
  }, [geometry])

  return (
    <Canvas camera={{ position: [2.4, 2.2, 2.8], fov: 45 }} style={{ width: '100%', height: '100%' }}>
      <color attach="background" args={['#F5F9FF']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />
      <directionalLight position={[-3, 2, -4]} intensity={0.4} />
      {geometry && (
        <mesh geometry={geometry} castShadow>
          <meshStandardMaterial color={WOOD} roughness={0.75} metalness={0.05} />
        </mesh>
      )}
      <gridHelper args={[8, 16, '#CBDDEF', '#E2ECF7']} position={[0, -0.6, 0]} />
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={8} />
    </Canvas>
  )
}
