// features/partStudio/canvas/DrawCanvas.tsx
//
// 左侧 2D 画布（RFC-021 §7）：网格背景 + 好看的手绘笔触 + 已确认轮廓。
// 几何运算不在这里（在 paperCanvas / 纯函数里），这里只负责"画给孩子看"。

import { useCallback, useEffect, useRef } from 'react'
import { getStroke } from 'perfect-freehand'
import type { Point2D } from '../types'
import { usePointerDrawing, type LivePoint } from './usePointerDrawing'

const GRID = 24
const ACCENT = '#1E9BFF'

interface DrawCanvasProps {
  /** 已确认的轮廓顶点（可能未闭合）。 */
  outline: Point2D[] | null
  /** 轮廓是否闭合。 */
  closed: boolean
  /** 完成一笔（抬笔）时回调原始点序。 */
  onStroke: (raw: Point2D[]) => void
}

function freehandPath(points: LivePoint[]): Path2D | null {
  if (points.length === 0) return null
  const stroke = getStroke(
    points.map((p) => [p.x, p.y, p.pressure]),
    { size: 7, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: false },
  )
  if (stroke.length === 0) return null
  const path = new Path2D()
  path.moveTo(stroke[0][0], stroke[0][1])
  for (let i = 1; i < stroke.length; i++) path.lineTo(stroke[i][0], stroke[i][1])
  path.closePath()
  return path
}

export function DrawCanvas({ outline, closed, onStroke }: DrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { livePoints } = usePointerDrawing(canvasRef, onStroke)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const cw = canvas.clientWidth
    const ch = canvas.clientHeight
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)

    // 网格
    ctx.strokeStyle = '#E2ECF7'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 0; x <= cw; x += GRID) {
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, ch)
    }
    for (let y = 0; y <= ch; y += GRID) {
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(cw, y + 0.5)
    }
    ctx.stroke()

    // 已确认轮廓
    if (outline && outline.length >= 2) {
      ctx.beginPath()
      ctx.moveTo(outline[0][0], outline[0][1])
      for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1])
      if (closed) {
        ctx.closePath()
        ctx.fillStyle = 'rgba(30,155,255,0.12)'
        ctx.fill()
        ctx.strokeStyle = ACCENT
        ctx.lineWidth = 2.5
        ctx.setLineDash([])
        ctx.stroke()
      } else {
        ctx.strokeStyle = '#9AB4CC'
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 6])
        ctx.stroke()
        ctx.setLineDash([])
        // 缺口标记：红圈点出首尾两端
        const ends = [outline[0], outline[outline.length - 1]]
        ctx.fillStyle = '#FF5A5A'
        for (const [x, y] of ends) {
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // 当前正在画的笔触
    const live = freehandPath(livePoints)
    if (live) {
      ctx.fillStyle = '#2B6CB0'
      ctx.fill(live)
    }
  }, [outline, closed, livePoints])

  useEffect(() => {
    redraw()
  }, [redraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => redraw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: 'crosshair' }}
    />
  )
}
