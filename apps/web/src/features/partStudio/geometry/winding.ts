// features/partStudio/geometry/winding.ts
//
// 绕向工具（鞋带公式）。挤出前必须校正：外轮廓 CCW、孔 CW，否则带孔零件破面/孔不通
// （RFC-021 §2 "确定踩的坑①"）。纯函数，可单测。

import type { Point2D } from '../types'

/**
 * 有符号面积（鞋带公式）。
 * 在 y 轴向上的标准数学坐标系里：正 = 逆时针(CCW)，负 = 顺时针(CW)。
 */
export function signedArea(points: Point2D[]): number {
  let area = 0
  const n = points.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % n]
    area += x1 * y2 - x2 * y1
  }
  return area / 2
}

/** 多边形面积（绝对值）。 */
export function polygonArea(points: Point2D[]): number {
  return Math.abs(signedArea(points))
}

/** 是否顺时针（y 向上坐标系）。 */
export function isClockwise(points: Point2D[]): boolean {
  return signedArea(points) < 0
}

/**
 * 校正绕向：返回满足期望绕向的点序（必要时反转）。
 * @param wantCCW true=要求逆时针（外轮廓），false=要求顺时针（孔）。
 */
export function ensureWinding(points: Point2D[], wantCCW: boolean): Point2D[] {
  const ccw = signedArea(points) > 0
  return ccw === wantCCW ? points : [...points].reverse()
}
