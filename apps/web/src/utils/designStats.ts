import type { PartInstance } from '../types/design'
import { summarizeCatalogueWeight } from './realtimeChecks'
import { computeMotorPlan } from './motorPlan'
import { checkSymmetry } from './symmetryCheck'

export interface DesignStats {
  /** Legacy field name: known catalogue estimate subtotal, never the measured whole-aircraft mass. */
  totalWeightG: number
  weightKnownCount: number
  weightMissingCount: number
  thrustWeightRatio: number | null
  symmetryPercent: number
  estimatedFlightMinutes: number | null
}

export function calculateStats(parts: PartInstance[]): DesignStats {
  const weight = summarizeCatalogueWeight(parts)
  const totalWeightG = weight.knownWeightG

  // 电机/桨/电池的实测包线尚未冻结，不能从机臂数量推算推力。
  const totalThrust = computeMotorPlan(parts).totalThrustG
  const thrustWeightRatio =
    weight.missingCount === 0 && totalWeightG > 0 && totalThrust !== null && totalThrust > 0
      ? Math.round((totalThrust / totalWeightG) * 10) / 10
      : null

  // Coordinate/type mirror matching uses the same existing rule as the structure report, not mean position.
  const symmetryPercent = parts.length > 0 ? checkSymmetry(parts, 0).score : 0

  // 续航必须来自已验证的电池、螺旋桨、电机和载荷曲线；当前不提供估算值。
  const estimatedFlightMinutes: number | null = null

  return { totalWeightG, weightKnownCount: weight.knownCount, weightMissingCount: weight.missingCount, thrustWeightRatio, symmetryPercent, estimatedFlightMinutes }
}

export function getWeightLabel(g: number, missingCount = 0): { text: string; ok: boolean } {
  if (!Number.isFinite(g) || g < 0) return { text: '缺少目录质量数据', ok: false }
  return { text: missingCount > 0 ? `目录估算不完整：${missingCount} 个零件缺少质量数据` : '仅目录估算，非整机实测重量', ok: false }
}

export function getThrustLabel(ratio: number | null): { text: string; ok: boolean } {
  if (ratio === null) return { text: '数据不全', ok: false }
  return { text: '推重比尚需实测核验', ok: false }
}

export function getSymmetryLabel(pct: number): { text: string; ok: boolean } {
  if (pct === 100) return { text: '坐标与型号镜像匹配，非质量平衡结论', ok: true }
  return { text: '部分坐标或型号未匹配，需核对设计', ok: false }
}

export function getFlightTimeLabel(min: number | null): { text: string; ok: boolean } {
  if (min === null) return { text: '数据不全', ok: false }
  return { text: '续航数据尚需实测核验', ok: false }
}
