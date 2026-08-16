import { describe, expect, it } from 'vitest'
import type { PartInstance } from '../types/design'
import type { PartCategory } from '@fwx/parts-schema'
import { computeMotorPlan } from './motorPlan'
import { evaluateFlightRules, type FlightRuleInput } from './flightReadiness'

let sequence = 0
function part(category: PartCategory, parentInstanceId?: string): PartInstance {
  const instanceId = `${category}-${sequence++}`
  return {
    instanceId,
    partId: `${category}_x`,
    category,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    attachedTo: parentInstanceId
      ? { parentInstanceId, parentConnectorId: 'c' }
      : null,
  }
}

describe('computeMotorPlan', () => {
  it('只数与主板连接的机臂，不伪造推力', () => {
    const mainboard = part('mainboard')
    const connected = [0, 1, 2, 3].map(() => part('landing', mainboard.instanceId))
    const isolated = part('landing')
    const plan = computeMotorPlan([mainboard, ...connected, isolated])
    expect(plan.motorCount).toBe(4)
    expect(plan.totalThrustG).toBeNull()
  })
})

const STRUCTURALLY_COMPLETE: FlightRuleInput = {
  hasMainboard: true,
  motorCount: 4,
  totalWeightG: 25,
  symmetryPercent: 95,
  thrustWeightRatio: null,
}

describe('evaluateFlightRules', () => {
  it('结构完整但没有硬件证据时仍不会宣称可飞', () => {
    const result = evaluateFlightRules(STRUCTURALLY_COMPLETE)
    expect(result.canTakeoff).toBe(false)
    expect(result.assessment).toBe('assembly-only')
    expect(result.issues.some((issue) => issue.code === 'EVIDENCE_MISSING')).toBe(true)
  })

  it('结构缺失优先显示结构问题', () => {
    const result = evaluateFlightRules({ ...STRUCTURALLY_COMPLETE, motorCount: 0 })
    expect(result.issues[0]?.code).toBe('STRUCTURE_MISSING')
  })
})
