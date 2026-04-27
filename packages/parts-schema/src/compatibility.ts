/**
 * Compatibility Engine — validates parts in the 4-category system.
 * Categories: mainboard, landing, guard, joint
 */
import type { PartCategory, BuildStep } from './index'
import { STEP_CATEGORIES, BUILD_STEPS } from './registry'
import type { PartEntry } from './registry'

export interface BuildState {
  currentStep: BuildStep
  parts: Array<{ partNumber: string; category: PartCategory }>
}

export type CompatibilityReason =
  | 'OK'
  | 'WRONG_STEP'
  | 'MAX_QUANTITY'
  | 'NEED_MAINBOARD_FIRST'
  | 'SNAP_TYPE_MISMATCH'

export interface CompatibilityResult {
  ok: boolean
  reason: CompatibilityReason
  message?: string
}

const MESSAGES: Record<CompatibilityReason, string> = {
  OK: '',
  WRONG_STEP: '还没到这一步哦，先完成当前步骤吧！',
  MAX_QUANTITY: '已经装满啦，不能再加了！',
  NEED_MAINBOARD_FIRST: '先选一块主板吧，它是一切的基础！',
  SNAP_TYPE_MISMATCH: '这个位置放不了这种零件，换个试试？',
}

export function isCategoryAllowedInStep(category: PartCategory, step: BuildStep): boolean {
  const allowed = STEP_CATEGORIES[step]
  return allowed.includes(category)
}

export function canAddPart(part: PartEntry, state: BuildState): CompatibilityResult {
  // Must have mainboard before anything else
  if (part.category !== 'mainboard' && !state.parts.some(p => p.category === 'mainboard')) {
    return { ok: false, reason: 'NEED_MAINBOARD_FIRST', message: MESSAGES.NEED_MAINBOARD_FIRST }
  }

  if (!isCategoryAllowedInStep(part.category, state.currentStep)) {
    return { ok: false, reason: 'WRONG_STEP', message: MESSAGES.WRONG_STEP }
  }

  // Mainboard: max 2
  if (part.category === 'mainboard') {
    const count = state.parts.filter(p => p.category === 'mainboard').length
    if (count >= 2) {
      return { ok: false, reason: 'MAX_QUANTITY', message: '最多只能放 2 块主板哦！' }
    }
  }

  // Landing: max 8
  if (part.category === 'landing') {
    const count = state.parts.filter(p => p.category === 'landing').length
    if (count >= 8) {
      return { ok: false, reason: 'MAX_QUANTITY', message: '最多 8 个起落架！' }
    }
  }

  // Guard: max 4
  if (part.category === 'guard') {
    const count = state.parts.filter(p => p.category === 'guard').length
    if (count >= 4) {
      return { ok: false, reason: 'MAX_QUANTITY', message: '最多 4 个保护板！' }
    }
  }

  return { ok: true, reason: 'OK' }
}

export function canAdvanceStep(state: BuildState): { canAdvance: boolean; reason?: string } {
  switch (state.currentStep) {
    case 'HUB':
      return state.parts.some(p => p.category === 'mainboard')
        ? { canAdvance: true }
        : { canAdvance: false, reason: '请先选择一块主板' }

    case 'ARM': {
      const count = state.parts.filter(p => p.category === 'landing').length
      return count >= 4
        ? { canAdvance: true }
        : { canAdvance: false, reason: `至少需要 4 个起落架（当前 ${count} 个）` }
    }

    case 'MOTOR':
      return { canAdvance: true }

    case 'GUARD': {
      const count = state.parts.filter(p => p.category === 'guard').length
      const valid = [1, 2, 4]
      return valid.includes(count)
        ? { canAdvance: true }
        : { canAdvance: false, reason: '保护板数量应为 1、2 或 4 个' }
    }

    case 'DECO':
      return { canAdvance: true } // Optional step, always advanceable

    case 'REVIEW':
      return { canAdvance: true }

    default:
      return { canAdvance: false }
  }
}

export function getNextStep(currentStep: BuildStep): BuildStep | null {
  const idx = BUILD_STEPS.indexOf(currentStep)
  if (idx === -1 || idx >= BUILD_STEPS.length - 1) return null
  return (BUILD_STEPS[idx + 1] as BuildStep | undefined) ?? null
}

export function getPrevStep(currentStep: BuildStep): BuildStep | null {
  const idx = BUILD_STEPS.indexOf(currentStep)
  if (idx <= 0) return null
  return (BUILD_STEPS[idx - 1] as BuildStep | undefined) ?? null
}
