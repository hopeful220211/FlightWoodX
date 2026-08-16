// features/partStudio/canvas/closePathDetect.test.ts
import { describe, it, expect } from 'vitest'
import type { Point2D } from '../types'
import { endpointGap, isClosed, snapClose } from './closePathDetect'

describe('closePathDetect', () => {
  it('endpointGap: 首尾距离', () => {
    expect(endpointGap([[0, 0], [10, 0], [10, 8]])).toBeCloseTo(Math.hypot(10, 8))
    expect(endpointGap([[0, 0]])).toBe(Infinity)
  })

  it('isClosed: 首尾在容差内且 >=3 点', () => {
    const nearlyClosed: Point2D[] = [[0, 0], [10, 0], [10, 10], [1, 1]]
    expect(isClosed(nearlyClosed, 2)).toBe(true)
    expect(isClosed(nearlyClosed, 0.5)).toBe(false)
    expect(isClosed([[0, 0], [1, 0]], 100)).toBe(false) // 点数不足
  })

  it('snapClose: 缺口在容差内 → 闭合，去掉近重合末点', () => {
    const pts: Point2D[] = [[0, 0], [10, 0], [10, 10], [0, 10], [0.1, 0.1]]
    const r = snapClose(pts, 2)
    expect(r.closed).toBe(true)
    expect(r.points.length).toBe(4) // 末点被吸合丢弃
  })

  it('snapClose: 缺口过大 → 不闭合，原样返回', () => {
    const pts: Point2D[] = [[0, 0], [10, 0], [10, 10], [0, 5]]
    const r = snapClose(pts, 2)
    expect(r.closed).toBe(false)
    expect(r.points).toBe(pts)
  })

  it('snapClose: 末点与起点有距离但在容差内 → 闭合但保留末点', () => {
    const pts: Point2D[] = [[0, 0], [10, 0], [10, 10], [1.5, 0]]
    const r = snapClose(pts, 2)
    expect(r.closed).toBe(true)
    expect(r.points.length).toBe(4)
  })
})
