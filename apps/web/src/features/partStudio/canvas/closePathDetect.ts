// features/partStudio/canvas/closePathDetect.ts
//
// 封闭检测 + 端点自动吸合（RFC-021 §8-2）。
// 真实激光切割只能切闭合轮廓，开口路径切三边停住、零件掉不下来——所以"必须先封闭"
// 是硬要求，不是 UI 摆设（PRD §3）。纯函数，可单测。

import type { Point2D } from '../types'

export function distance(a: Point2D, b: Point2D): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1])
}

/** 首尾两端点之间的缺口距离；点数不足返回 Infinity。 */
export function endpointGap(points: Point2D[]): number {
  if (points.length < 2) return Infinity
  return distance(points[0], points[points.length - 1])
}

/** 在容差内即视为闭合（至少 3 个点才构成面）。 */
export function isClosed(points: Point2D[], threshold: number): boolean {
  return points.length >= 3 && endpointGap(points) <= threshold
}

export interface SnapCloseResult {
  points: Point2D[]
  closed: boolean
}

/**
 * 抬笔即判：首尾在容差内 → 自动吸合成闭合环（丢掉与起点几乎重合的末点，避免重复顶点）；
 * 否则保持开口、closed=false（由 UI 高亮"这里有个缺口"）。
 */
export function snapClose(points: Point2D[], threshold: number): SnapCloseResult {
  if (points.length < 3) return { points, closed: false }
  const gap = endpointGap(points)
  if (gap <= threshold) {
    // 末点与起点近重合时去掉末点，保留 n 个互异顶点
    const points2 = gap < threshold * 0.25 ? points.slice(0, -1) : points
    return { points: points2.length >= 3 ? points2 : points, closed: true }
  }
  return { points, closed: false }
}
