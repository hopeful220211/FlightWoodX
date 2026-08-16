// features/partStudio/geometry/winding.test.ts
import { describe, it, expect } from 'vitest'
import type { Point2D } from '../types'
import { signedArea, polygonArea, isClockwise, ensureWinding } from './winding'

// 单位正方形，逆时针（y 向上）
const ccwSquare: Point2D[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
]
// 同一正方形，顺时针
const cwSquare: Point2D[] = [...ccwSquare].reverse()

describe('winding', () => {
  it('signedArea: CCW 为正、CW 为负', () => {
    expect(signedArea(ccwSquare)).toBeGreaterThan(0)
    expect(signedArea(cwSquare)).toBeLessThan(0)
  })

  it('polygonArea: 单位正方形面积为 1（与绕向无关）', () => {
    expect(polygonArea(ccwSquare)).toBeCloseTo(1)
    expect(polygonArea(cwSquare)).toBeCloseTo(1)
  })

  it('isClockwise 正确判定', () => {
    expect(isClockwise(ccwSquare)).toBe(false)
    expect(isClockwise(cwSquare)).toBe(true)
  })

  it('ensureWinding: 要 CCW 时把 CW 反转、CCW 原样', () => {
    expect(signedArea(ensureWinding(cwSquare, true))).toBeGreaterThan(0)
    expect(ensureWinding(ccwSquare, true)).toBe(ccwSquare) // 已满足则原样返回
  })

  it('ensureWinding: 要 CW 时把 CCW 反转', () => {
    expect(signedArea(ensureWinding(ccwSquare, false))).toBeLessThan(0)
  })
})
