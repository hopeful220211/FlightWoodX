// features/partStudio/canvas/usePointerDrawing.ts
//
// 一套 Pointer Events 通吃 笔/手指/鼠标（RFC-021 §2 输入层）。要点：
// - getCoalescedEvents() 取两帧间全部中间点（否则快划线会断成折线）
// - e.pressure 压感（喂给 perfect-freehand 显示）
// - 掌触防误：笔在画时忽略 touch（pen 优先）
// - pointercancel：丢弃当前笔画，不丢整体状态
// 画布元素需自带 CSS `touch-action: none`（在 DrawCanvas 里设），防页面被划走。

import { useEffect, useRef, useState } from 'react'
import type { Point2D } from '../types'

export interface LivePoint {
  x: number
  y: number
  pressure: number
}

export function usePointerDrawing(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onStrokeComplete: (points: Point2D[]) => void,
) {
  const [livePoints, setLivePoints] = useState<LivePoint[]>([])

  const drawing = useRef(false)
  const activeId = useRef<number | null>(null)
  const activeType = useRef<string>('')
  const buffer = useRef<LivePoint[]>([])

  // 用 ref 持有最新回调，避免因回调变化反复重绑监听器
  const onComplete = useRef(onStrokeComplete)
  useEffect(() => {
    onComplete.current = onStrokeComplete
  }, [onStrokeComplete])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const toLocal = (e: PointerEvent): LivePoint => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        pressure: e.pressure > 0 ? e.pressure : 0.5,
      }
    }

    const reset = () => {
      drawing.current = false
      activeId.current = null
      activeType.current = ''
      buffer.current = []
      setLivePoints([])
    }

    const onDown = (e: PointerEvent) => {
      if (drawing.current) return // 已有指针在画 → 忽略后到的（掌触/第二指）
      // setPointerCapture 在个别浏览器/边界情形会抛错，不能让它中断画画
      try {
        canvas.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      drawing.current = true
      activeId.current = e.pointerId
      activeType.current = e.pointerType
      const p = toLocal(e)
      buffer.current = [p]
      setLivePoints([p])
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      if (!drawing.current || e.pointerId !== activeId.current) return
      if (activeType.current === 'pen' && e.pointerType === 'touch') return // 笔在画 → 忽略掌触
      const coalesced =
        typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : []
      const batch = (coalesced.length ? coalesced : [e]).map(toLocal)
      buffer.current.push(...batch)
      setLivePoints([...buffer.current])
      e.preventDefault()
    }

    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== activeId.current) return
      const pts = buffer.current
      reset()
      if (pts.length >= 2) {
        onComplete.current(pts.map((p) => [p.x, p.y] as Point2D))
      }
      e.preventDefault()
    }

    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== activeId.current) return
      reset() // 丢弃当前笔画
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
    }
  }, [canvasRef])

  return { livePoints }
}
