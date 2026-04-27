import type { PartInstance } from '../types/design'
import type { PartCategory } from '@fwx/parts-schema'

export interface DesignStats {
  totalWeightG: number
  thrustWeightRatio: number | null
  symmetryPercent: number
  estimatedFlightMinutes: number | null
}

function countByCategory(parts: PartInstance[], cat: PartCategory): number {
  return parts.filter(p => p.category === cat).length
}

export function calculateStats(parts: PartInstance[]): DesignStats {
  // Weight: rough estimate per part category
  const weights: Record<string, number> = {
    HUB: 10, ARM: 5, PLATE: 12, JOINT: 6, LAND: 7, DECO: 3, MOTOR: 4, PROP: 2,
  }
  const totalWeightG = parts.reduce((sum, p) => sum + (weights[p.category] ?? 8), 0)

  // Thrust: each ARM implies one motor, ~20g thrust per motor
  const armCount = countByCategory(parts, 'landing')
  const totalThrust = armCount * 20
  const thrustWeightRatio = totalThrust > 0 ? Math.round((totalThrust / totalWeightG) * 10) / 10 : null

  // Symmetry: how centered is the part distribution
  let symmetryPercent = 100
  if (parts.length >= 2) {
    const positions = parts.map(p => p.position)
    const cx = positions.reduce((s, p) => s + p[0], 0) / positions.length
    const cz = positions.reduce((s, p) => s + p[2], 0) / positions.length
    const maxSpread = Math.max(
      ...positions.map(p => Math.sqrt((p[0] - cx) ** 2 + (p[2] - cz) ** 2)),
      0.01,
    )
    const centerOffset = Math.sqrt(cx * cx + cz * cz)
    symmetryPercent = Math.max(0, Math.round((1 - centerOffset / maxSpread) * 100))
  }

  // Flight time: rough estimate based on weight and thrust
  let estimatedFlightMinutes: number | null = null
  if (thrustWeightRatio !== null && thrustWeightRatio > 1) {
    // Lighter = longer, higher thrust ratio = shorter (more power used)
    estimatedFlightMinutes = Math.round(12 - totalWeightG * 0.05 - (thrustWeightRatio - 1) * 2)
    estimatedFlightMinutes = Math.max(2, Math.min(15, estimatedFlightMinutes))
  }

  return { totalWeightG, thrustWeightRatio, symmetryPercent, estimatedFlightMinutes }
}

export function getWeightLabel(g: number): { text: string; ok: boolean } {
  if (g <= 60) return { text: '够轻', ok: true }
  if (g <= 100) return { text: '适中', ok: true }
  return { text: '偏重，可能影响起飞', ok: false }
}

export function getThrustLabel(ratio: number | null): { text: string; ok: boolean } {
  if (ratio === null) return { text: '数据不全', ok: false }
  if (ratio >= 2) return { text: '够强', ok: true }
  if (ratio >= 1.5) return { text: '刚好够', ok: true }
  return { text: '推力不足', ok: false }
}

export function getSymmetryLabel(pct: number): { text: string; ok: boolean } {
  if (pct >= 90) return { text: '很对称', ok: true }
  if (pct >= 70) return { text: '基本对称', ok: true }
  return { text: '偏向一侧', ok: false }
}

export function getFlightTimeLabel(min: number | null): { text: string; ok: boolean } {
  if (min === null) return { text: '数据不全', ok: false }
  if (min >= 6) return { text: '够久', ok: true }
  if (min >= 4) return { text: '还行', ok: true }
  return { text: '偏短', ok: false }
}
