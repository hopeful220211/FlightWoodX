// utils/motorPlan.ts
//
// RFC-022：电机数从"真实连到主板的机臂"派生（命门）。
// 不能用 parts.filter(category==='landing') —— 没连上主板的孤立机臂不算电机。
// 沿 PartInstance.attachedTo 从主板做可达性 BFS。被 designStats 与 flightReadiness 共用。

import type { PartInstance } from '../types/design'

/** 套件当前的结构目标；物理能力仍需由工程证据包线提供。 */
export const KIT_CONFIG = { allowedMotorCounts: [4] as const }

export interface MotorPlan {
  /** 真实连到主板的机臂数 = 派生的动力点数。 */
  motorCount: number
  /** 这些机臂的 instanceId（供第二期在 3D 上画动力点用）。 */
  connectedArmInstanceIds: string[]
  /** 实测推力尚未进入数据源时必须为 null，不能用演示常数代替。 */
  totalThrustG: number | null
}

export function computeMotorPlan(parts: PartInstance[]): MotorPlan {
  const mainboards = parts.filter((p) => p.category === 'mainboard')
  if (mainboards.length === 0) {
    return { motorCount: 0, connectedArmInstanceIds: [], totalThrustG: null }
  }

  // 邻接表：parentInstanceId → 直接子零件
  const childrenOf = new Map<string, PartInstance[]>()
  for (const p of parts) {
    const parentId = p.attachedTo?.parentInstanceId
    if (!parentId) continue
    const arr = childrenOf.get(parentId)
    if (arr) arr.push(p)
    else childrenOf.set(parentId, [p])
  }

  const visited = new Set<string>()
  const queue: string[] = mainboards.map((m) => m.instanceId)
  const connectedArmInstanceIds: string[] = []

  while (queue.length) {
    const id = queue.shift()
    if (id === undefined || visited.has(id)) continue
    visited.add(id)
    for (const child of childrenOf.get(id) ?? []) {
      if (visited.has(child.instanceId)) continue
      if (child.category === 'landing') connectedArmInstanceIds.push(child.instanceId)
      queue.push(child.instanceId)
    }
  }

  const motorCount = connectedArmInstanceIds.length
  return { motorCount, connectedArmInstanceIds, totalThrustG: null }
}
