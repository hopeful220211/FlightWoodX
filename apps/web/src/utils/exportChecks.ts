import type { PartInstance } from '../types/design'
import type { PartCategory } from '@fwx/parts-schema'
import { checkCategorySymmetry } from './symmetryCheck'
import { summarizeCatalogueWeight } from './realtimeChecks'

export type CheckLevel = 'pass' | 'warning' | 'error'

export interface CheckResult {
  id: string
  level: CheckLevel
  title: string
  detail?: string
  fixHint?: string
}

function countByCategory(parts: PartInstance[], cat: PartCategory): number {
  return parts.filter(p => p.category === cat).length
}

function checkMainboard(parts: PartInstance[]): CheckResult {
  const count = countByCategory(parts, 'mainboard')
  return count > 0
    ? { id: 'mainboard', level: 'pass', title: `设计中记录了 ${count} 个主板件` }
    : { id: 'mainboard', level: 'error', title: '缺少主板记录', fixHint: '回到第 1 步选择一个主板' }
}

function checkArmCount(parts: PartInstance[]): CheckResult {
  const count = countByCategory(parts, 'landing')
  return { id: 'armCount', level: count > 0 ? 'pass' : 'warning', title: `设计中记录了 ${count} 个起落架件`, detail: '仅统计 landing 分类，不从数量推断电机配置或飞行能力。' }
}

function checkArmSymmetry(parts: PartInstance[]): CheckResult {
  const arms = parts.filter(p => p.category === 'landing')
  if (arms.length < 2) return { id: 'armSymmetry', level: 'warning', title: '起落架记录不足，无法比较左右镜像' }

  const isSymmetric = checkCategorySymmetry(arms.map(a => ({ partId: a.partId, position: a.position })))
  if (isSymmetric) return { id: 'armSymmetry', level: 'pass', title: '起落架坐标左右镜像匹配', detail: '仅比较设计坐标与型号，不代表实物质量平衡。' }
  return { id: 'armSymmetry', level: 'warning', title: '起落架坐标未匹配左右镜像', fixHint: '核对设计中的位置和型号' }
}

function checkArmSameType(parts: PartInstance[]): CheckResult {
  const arms = parts.filter(p => p.category === 'landing')
  if (arms.length === 0) return { id: 'armSameType', level: 'warning', title: '没有可核对的起落架型号' }
  const types = new Set(arms.map(a => a.partId))
  if (types.size === 1) return { id: 'armSameType', level: 'pass', title: '起落架型号一致' }
  return { id: 'armSameType', level: 'warning', title: `记录了 ${types.size} 种起落架型号`, detail: '当前未验证不同型号的结构兼容性。' }
}

function checkGuardSymmetry(parts: PartInstance[]): CheckResult {
  const guards = parts.filter(p => p.category === 'guard')
  if (guards.length <= 1) return { id: 'guardSymmetry', level: 'warning', title: '保护板记录不足，无法比较左右镜像' }

  const isSymmetric = checkCategorySymmetry(guards.map(g => ({ partId: g.partId, position: g.position })))
  if (isSymmetric) return { id: 'guardSymmetry', level: 'pass', title: '保护板坐标左右镜像匹配', detail: '仅比较设计坐标与型号，不代表实物质量平衡。' }
  return { id: 'guardSymmetry', level: 'warning', title: '保护板坐标未匹配左右镜像', fixHint: '核对设计中的位置和型号' }
}

function checkGuardSameType(parts: PartInstance[]): CheckResult {
  const guards = parts.filter(p => p.category === 'guard')
  if (guards.length === 0) return { id: 'guardSameType', level: 'warning', title: '没有可核对的保护板型号' }
  const types = new Set(guards.map(g => g.partId))
  if (types.size === 1) return { id: 'guardSameType', level: 'pass', title: '保护板型号一致' }
  return { id: 'guardSameType', level: 'warning', title: `记录了 ${types.size} 种保护板型号`, detail: '当前未验证不同型号的结构兼容性。' }
}

function checkMotorCount(parts: PartInstance[]): CheckResult {
  const motors = countByCategory(parts, 'MOTOR')
  const props = countByCategory(parts, 'PROP')
  return { id: 'motorCount', level: 'warning', title: `电机实例 ${motors} 个，螺旋桨实例 ${props} 个`, detail: '实例数量不证明实物已安装；电机、螺旋桨、电池和飞控配置尚未验证。' }
}

function checkConnectorPairs(parts: PartInstance[]): CheckResult {
  if (!parts.length) return { id: 'connectorPairs', level: 'warning', title: '没有可核对的连接记录' }
  const byId = new Map(parts.map(part => [part.instanceId, part]))
  const reachesMainboard = (part: PartInstance): boolean => {
    const visited = new Set<string>()
    let current: PartInstance | undefined = part
    while (current && !visited.has(current.instanceId)) {
      if (current.category === 'mainboard') return true
      visited.add(current.instanceId)
      current = current.attachedTo ? byId.get(current.attachedTo.parentInstanceId) : undefined
    }
    return false
  }
  const detached = parts.filter(part => !reachesMainboard(part)).length
  if (detached === 0) return { id: 'connectorPairs', level: 'pass', title: '父件引用可追溯到主板记录', detail: '未验证卡扣配合、连接强度或实物安装。' }
  return { id: 'connectorPairs', level: 'error', title: `有 ${detached} 个零件缺少有效主板连接记录`, detail: '包含未连接、父件不存在或循环引用的记录。', fixHint: '回到工作台核对连接关系' }
}

function checkLandingGear(parts: PartInstance[]): CheckResult {
  const landing = parts.filter(part => part.category === 'landing')
  const linked = landing.filter(part => part.attachedTo).length
  return { id: 'landingGear', level: linked === landing.length && landing.length > 0 ? 'pass' : 'warning', title: `${landing.length} 个起落架件中，${linked} 个填写了父件引用`, detail: '连接有效性由连接记录项核对，着陆性能尚未验证。' }
}

function checkGuard(parts: PartInstance[]): CheckResult {
  const count = countByCategory(parts, 'guard')
  return { id: 'guard', level: count > 0 ? 'pass' : 'warning', title: `设计中记录了 ${count} 个保护板件`, detail: '当前未验证螺旋桨间隙和实物防护效果。' }
}

function checkWeightBalance(): CheckResult {
  return { id: 'weightBalance', level: 'warning', title: '整机重心未验证', detail: '缺少完整硬件质量与实测质心，不能用零件坐标平均值判断飞行稳定性。' }
}

function checkTotalWeight(parts: PartInstance[]): CheckResult {
  const { knownWeightG, knownCount, missingCount } = summarizeCatalogueWeight(parts)
  return {
    id: 'totalWeight', level: 'warning',
    title: knownCount > 0 ? `已知目录质量估算小计 ${knownWeightG.toFixed(1)}g` : '缺少可用的目录质量估算',
    detail: `${missingCount} 个零件缺少可核对的质量数据。目录数值为估算，不含未记录硬件，不是整机实测重量。`,
  }
}

const ALL_CHECKS = [
  checkMainboard,
  checkArmCount,
  checkArmSameType,
  checkArmSymmetry,
  checkMotorCount,
  checkConnectorPairs,
  checkLandingGear,
  checkGuard,
  checkGuardSameType,
  checkGuardSymmetry,
  checkWeightBalance,
  checkTotalWeight,
]

export function runAllChecks(parts: PartInstance[]): CheckResult[] {
  return ALL_CHECKS.map(fn => fn(parts))
}

export function calculateScore(checks: CheckResult[]): number {
  const errors = checks.filter(c => c.level === 'error').length
  const warnings = checks.filter(c => c.level === 'warning').length
  return Math.max(0, 100 - errors * 30 - warnings * 5)
}

export function getScoreLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: '记录较完整', color: 'text-accent-leaf' }
  if (score >= 70) return { text: '部分待核对', color: 'text-wood-500' }
  if (score >= 50) return { text: '多项待核对', color: 'text-accent-gold' }
  return { text: '记录待补充', color: 'text-[#E04545]' }
}
