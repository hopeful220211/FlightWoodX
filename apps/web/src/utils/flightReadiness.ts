// utils/flightReadiness.ts
//
// RFC-024 §4.5：起飞合规规则已下沉到共享包 @fwx/flight-check（前后端同源，服务端发布时复核）。
// 本文件只保留「设计零件 → 规则输入」的采集适配（连真实零件/统计），规则本身不再在 web 里重写一份。

import type { PartInstance } from '../types/design'
import { calculateStats } from './designStats'
import { computeMotorPlan, type MotorPlan } from './motorPlan'
import { evaluateFlightRules, type FlightReadiness } from '@fwx/flight-check'

// 契约与规则函数一律出自共享包；此处按原名再导出，页面/测试的既有 import 不变。
export {
  evaluateFlightRules,
  REQUIRED_ARM_COUNT,
} from '@fwx/flight-check'
export type {
  FlightIssueCode,
  FlightIssue,
  FlightReadiness,
  FlightRuleInput,
  VerifiedFlightEnvelope,
} from '@fwx/flight-check'

export interface FlightReadinessResult extends FlightReadiness {
  motorPlan: MotorPlan
}

/** 从设计零件计算起飞合格性（连真实零件数据）。 */
export function flightReadiness(parts: PartInstance[]): FlightReadinessResult {
  const motorPlan = computeMotorPlan(parts)
  const stats = calculateStats(parts)
  const rules = evaluateFlightRules({
    hasMainboard: parts.some((p) => p.category === 'mainboard'),
    motorCount: motorPlan.motorCount,
    totalWeightG: stats.totalWeightG,
    symmetryPercent: stats.symmetryPercent,
    thrustWeightRatio: stats.thrustWeightRatio,
  })
  return { ...rules, motorPlan }
}
