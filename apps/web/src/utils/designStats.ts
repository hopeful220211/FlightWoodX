import type { PartInstance } from '../types/design'
import { calculateWeight } from './realtimeChecks'
import { computeMotorPlan } from './motorPlan'

export interface DesignStats {
  totalWeightG: number
  thrustWeightRatio: number | null
  symmetryPercent: number
  estimatedFlightMinutes: number | null
}

export function calculateStats(parts: PartInstance[]): DesignStats {
  // 重量口径与顶部重量条统一：复用 calculateWeight（真实零件重量），
  // 不再用第二套按旧分类码的估算表（HUB/ARM… 与现行新分类对不上，会回退成 8g）。
  const totalWeightG = calculateWeight(parts)

  // 电机/桨/电池的实测包线尚未冻结，不能从机臂数量推算推力。
  const totalThrust = computeMotorPlan(parts).totalThrustG
  const thrustWeightRatio =
    totalWeightG > 0 && totalThrust !== null && totalThrust > 0
      ? Math.round((totalThrust / totalWeightG) * 10) / 10
      : null

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

  // 续航必须来自已验证的电池、螺旋桨、电机和载荷曲线；当前不提供估算值。
  const estimatedFlightMinutes: number | null = null

  return { totalWeightG, thrustWeightRatio, symmetryPercent, estimatedFlightMinutes }
}

export function getWeightLabel(g: number): { text: string; ok: boolean } {
  // 与重量条 35g 上限口径一致
  if (g <= 25) return { text: '够轻', ok: true }
  if (g <= 35) return { text: '适中', ok: true }
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
