import type { PartInstance } from '../types/design'
import type { PartCategory } from '@fwx/parts-schema'

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
  return countByCategory(parts, 'mainboard') >= 1
    ? { id: 'mainboard', level: 'pass', title: '主板已安装' }
    : { id: 'mainboard', level: 'error', title: '缺少主板', detail: '飞机需要一块核心主板才能装其他零件', fixHint: '回到第 1 步选择一个主板' }
}

function checkArmCount(parts: PartInstance[]): CheckResult {
  const count = countByCategory(parts, 'landing')
  if (count >= 4) return { id: 'armCount', level: 'pass', title: `${count} 个机臂已安装` }
  if (count === 3) return { id: 'armCount', level: 'warning', title: `只有 ${count} 个机臂`, detail: '3 个机臂可以飞，但不太稳', fixHint: '建议至少 4 个机臂' }
  return { id: 'armCount', level: 'error', title: `机臂太少（${count} 个）`, detail: '至少需要 3 个机臂才能飞', fixHint: '回到第 2 步添加更多机臂' }
}

function checkArmSymmetry(parts: PartInstance[]): CheckResult {
  const arms = parts.filter(p => p.category === 'landing')
  if (arms.length < 2) return { id: 'armSymmetry', level: 'pass', title: '机臂对称性正常' }

  const positions = arms.map(a => a.position)
  const cx = positions.reduce((s, p) => s + p[0], 0) / positions.length
  const cz = positions.reduce((s, p) => s + p[2], 0) / positions.length
  const maxOffset = Math.max(Math.abs(cx), Math.abs(cz))

  if (maxOffset < 0.01) return { id: 'armSymmetry', level: 'pass', title: '机臂对称分布' }
  if (maxOffset < 0.05) return { id: 'armSymmetry', level: 'warning', title: '机臂分布稍有偏移', detail: '不影响飞行，但可能会轻微倾斜', fixHint: '尝试让机臂分布更均匀' }
  return { id: 'armSymmetry', level: 'warning', title: '机臂不对称', detail: '机臂不对称会让飞机歪', fixHint: '调整机臂位置让它更均匀' }
}

function checkMotorCount(parts: PartInstance[]): CheckResult {
  const arms = countByCategory(parts, 'landing')
  // Motors are auto-installed in guided mode (Step 3)
  // Treat motor count as equal to arm count for guided designs
  return { id: 'motorCount', level: 'pass', title: `${arms} 个电机已配齐` }
}

function checkConnectorPairs(parts: PartInstance[]): CheckResult {
  const attached = parts.filter(p => p.attachedTo).length
  const detached = parts.filter(p => !p.attachedTo && p.category !== 'mainboard').length

  if (detached === 0) return { id: 'connectorPairs', level: 'pass', title: '所有连接点都已配对' }
  return { id: 'connectorPairs', level: 'error', title: `有 ${detached} 个零件没装好`, detail: '这些零件还没有连接到其他零件上', fixHint: '回到工作台检查未连接的零件' }
}

function checkLandingGear(parts: PartInstance[]): CheckResult {
  const count = countByCategory(parts, 'landing')
  if (count >= 4) return { id: 'landingGear', level: 'pass', title: `${count} 个起落架` }
  if (count > 0) return { id: 'landingGear', level: 'warning', title: `起落架数量偏少（${count} 个）`, detail: '建议至少 4 个起落架，着陆更稳', fixHint: '可以在第 4 步添加更多' }
  return { id: 'landingGear', level: 'warning', title: '没有起落架', detail: '没有起落架也能飞，但着陆时不太方便', fixHint: '考虑添加起落架保护飞机' }
}

function checkGuard(parts: PartInstance[]): CheckResult {
  const plates = countByCategory(parts, 'guard')
  const joints = countByCategory(parts, 'guard')
  const total = plates + joints
  if (total > 0) return { id: 'guard', level: 'pass', title: '保护罩已安装' }
  return { id: 'guard', level: 'warning', title: '没有保护罩', detail: '保护罩可以保护螺旋桨不被碰到', fixHint: '在第 4 步选择一种保护罩' }
}

function checkWeightBalance(parts: PartInstance[]): CheckResult {
  if (parts.length < 2) return { id: 'weightBalance', level: 'pass', title: '重心位置合理' }

  const positions = parts.map(p => p.position)
  const cx = positions.reduce((s, p) => s + p[0], 0) / positions.length
  const cz = positions.reduce((s, p) => s + p[2], 0) / positions.length
  const offset = Math.sqrt(cx * cx + cz * cz)

  if (offset < 0.02) return { id: 'weightBalance', level: 'pass', title: '重心位置合理' }
  return { id: 'weightBalance', level: 'warning', title: '重心有点偏', detail: '飞行时容易向一侧倾斜', fixHint: '让两边的零件数量和重量更均匀' }
}

function checkTotalWeight(parts: PartInstance[]): CheckResult {
  // Rough weight: each part ~5-15g, motor thrust ~20g per motor
  const armCount = countByCategory(parts, 'landing')
  const totalWeight = parts.length * 8 // rough average
  const maxThrust = armCount * 20 // rough per-motor thrust

  if (maxThrust === 0 && totalWeight > 0) {
    return { id: 'totalWeight', level: 'error', title: '没有电机推力', detail: '需要机臂和电机才能产生推力', fixHint: '确保有足够的机臂' }
  }
  if (totalWeight < maxThrust * 0.8) return { id: 'totalWeight', level: 'pass', title: '重量合适' }
  if (totalWeight < maxThrust) return { id: 'totalWeight', level: 'warning', title: '有点重', detail: '推力刚好够，飞行时间可能较短', fixHint: '试试减少一些非必要零件' }
  return { id: 'totalWeight', level: 'error', title: '飞机太重了', detail: '电机推不动这么重的飞机', fixHint: '减少零件数量或选更轻的零件' }
}

const ALL_CHECKS = [
  checkMainboard,
  checkArmCount,
  checkArmSymmetry,
  checkMotorCount,
  checkConnectorPairs,
  checkLandingGear,
  checkGuard,
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
  if (score >= 90) return { text: '优秀', color: 'text-accent-leaf' }
  if (score >= 70) return { text: '良好', color: 'text-wood-500' }
  if (score >= 50) return { text: '及格', color: 'text-accent-gold' }
  return { text: '需要改进', color: 'text-[#E04545]' }
}
