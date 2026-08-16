// features/partStudio/canvas/paperCanvas.ts
//
// paper.js 几何封装。M1 只用 path.simplify 做降噪/抽稀（手绘几百个点 → 几十个干净顶点）。
// 后续里程碑（M4）的布尔 unite / 镜像 / 圆角也走这里。
//
// 约定（RFC-021 §2 "确定踩的坑②"）：paper.js 是命令式库，挂一条独立的离屏 canvas，
// 绝不塞进 r3f 渲染循环——这里只做"点进点出"的纯几何运算，不参与任何 React 渲染。

import paper from 'paper'
import type { Point2D } from '../types'

let scope: paper.PaperScope | null = null

/** 惰性初始化一个独立 PaperScope（离屏 1x1 canvas），仅浏览器环境调用。 */
function getScope(): paper.PaperScope {
  if (scope) return scope
  const s = new paper.PaperScope()
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  s.setup(canvas)
  scope = s
  return s
}

/**
 * 用 paper.js 对手绘点做降噪抽稀，返回简化后的顶点序列。
 * tolerance 越大越平滑、点越少（②建议 2.5）。
 * paper 初始化/运算异常时安全回退到原始点，绝不让画布崩。
 */
export function simplifyPath(points: Point2D[], tolerance = 2.5): Point2D[] {
  if (points.length < 3) return points
  try {
    const s = getScope()
    const path = new s.Path({
      segments: points.map((p) => new s.Point(p[0], p[1])),
    })
    path.simplify(tolerance)
    const out: Point2D[] = path.segments.map((seg) => [seg.point.x, seg.point.y])
    path.remove()
    return out.length >= 3 ? out : points
  } catch {
    return points
  }
}
