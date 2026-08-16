/**
 * Real-time assembly validation — runs on every part add/remove.
 * Lighter than exportChecks (no score/label), returns actionable violations.
 */
import type { PartInstance } from '../types/design'
import type { PartCategory } from '@fwx/parts-schema'
import { getPartById } from '@fwx/parts-schema'

export interface Violation {
  id: string
  level: 'error' | 'warning'
  message: string
  hint?: string
}

function countByCategory(parts: PartInstance[], cat: PartCategory): number {
  return parts.filter(p => p.category === cat).length
}

/**
 * Check if adding a part would violate any assembly rule.
 * Returns a violation if blocked, null if allowed.
 * Called BEFORE the part is actually placed.
 */
export function checkBeforeAdd(
  partCategory: PartCategory,
  partId: string,
  currentParts: PartInstance[],
): Violation | null {
  // Mainboard: max 2
  if (partCategory === 'mainboard') {
    const count = countByCategory(currentParts, 'mainboard')
    if (count >= 2) {
      return { id: 'mainboard-max', level: 'error', message: '最多只能放 2 块主板哦！', hint: '已经有 2 块了' }
    }
  }

  // Landing: max 8
  if (partCategory === 'landing') {
    const count = countByCategory(currentParts, 'landing')
    if (count >= 8) {
      return { id: 'landing-max', level: 'error', message: '最多 8 个起落架！', hint: '再多飞机就太重了' }
    }
  }

  // Guard: max 4
  if (partCategory === 'guard') {
    const count = countByCategory(currentParts, 'guard')
    if (count >= 4) {
      return { id: 'guard-max', level: 'error', message: '最多 4 个保护板！', hint: '1个、2个或4个都可以' }
    }
  }

  // Weight check: would adding this part exceed 35g?
  const entry = getPartById(partId)
  const addWeight = entry?.weightG ?? 2
  const currentWeight = currentParts.reduce((sum, p) => {
    const e = getPartById(p.partId)
    return sum + (e?.weightG ?? 2)
  }, 0)

  if (currentWeight + addWeight > 35) {
    return {
      id: 'weight-over',
      level: 'error',
      message: `超重了！加上这个零件会到 ${(currentWeight + addWeight).toFixed(1)}g`,
      hint: '上限 35g，试试拆掉一些零件',
    }
  }

  return null
}

/**
 * Check mainboard dual-board geometry: if 2 mainboards, they must be
 * on parallel horizontal planes (different Y, similar X/Z rotation).
 */
export function checkDualMainboard(parts: PartInstance[]): Violation | null {
  const mainboards = parts.filter(p => p.category === 'mainboard')
  if (mainboards.length !== 2) return null

  const yDiff = Math.abs(mainboards[0].position[1] - mainboards[1].position[1])
  // Models scaled to 2mm thickness — Y gap between stacked mainboards is small
  if (yDiff < 0.005) {
    return {
      id: 'mainboard-parallel',
      level: 'warning',
      message: '两块主板要放在上下两层',
      hint: '建议不要放在同一高度',
    }
  }

  const tilt0 = Math.max(Math.abs(mainboards[0].rotation[0]), Math.abs(mainboards[0].rotation[2]))
  const tilt1 = Math.max(Math.abs(mainboards[1].rotation[0]), Math.abs(mainboards[1].rotation[2]))
  if (tilt0 > 0.1 || tilt1 > 0.1) {
    return {
      id: 'mainboard-level',
      level: 'warning',
      message: '两块主板都要保持水平',
      hint: '建议保持水平放置',
    }
  }

  return null
}

/**
 * Calculate current assembly weight from registry data.
 */
export function calculateWeight(parts: PartInstance[]): number {
  return parts.reduce((sum, p) => {
    const entry = getPartById(p.partId)
    return sum + (entry?.weightG ?? 2)
  }, 0)
}

/**
 * Get weight bar color class based on percentage of 35g limit.
 */
export function getWeightColor(weight: number): string {
  const pct = weight / 35
  if (pct <= 0.7) return 'bg-accent-leaf'
  if (pct <= 0.9) return 'bg-accent-gold'
  if (pct <= 1.0) return 'bg-wood-500'
  return 'bg-[#E04545]'
}

export function getWeightTextColor(weight: number): string {
  const pct = weight / 35
  if (pct <= 0.7) return 'text-accent-leaf'
  if (pct <= 0.9) return 'text-accent-gold'
  if (pct <= 1.0) return 'text-wood-500'
  return 'text-[#E04545]'
}
