/**
 * Compatibility Engine — validates whether a part can be added in the current build state.
 */
import type { PartCategory, BuildStep } from './index'
import { STEP_CATEGORIES, BUILD_STEPS } from './registry'
import type { PartEntry } from './registry'

export interface BuildState {
  currentStep: BuildStep
  parts: Array<{ partNumber: string; category: PartCategory }>
  hubLayer?: 'single' | 'double'
}

export type CompatibilityReason =
  | 'OK'
  | 'WRONG_STEP'
  | 'MAX_QUANTITY'
  | 'NEED_HUB_FIRST'
  | 'SNAP_TYPE_MISMATCH'
  | 'DECO_NOT_NEEDED'

export interface CompatibilityResult {
  ok: boolean
  reason: CompatibilityReason
  message?: string
}

/** Friendly messages for kids */
const MESSAGES: Record<CompatibilityReason, string> = {
  OK: '',
  WRONG_STEP: '还没到这一步哦，先完成当前步骤吧！',
  MAX_QUANTITY: '已经装满啦，不能再加了！',
  NEED_HUB_FIRST: '先选一块主板吧，它是一切的基础！',
  SNAP_TYPE_MISMATCH: '这个位置放不了这种零件，换个试试？',
  DECO_NOT_NEEDED: '你的主板是单层的，不需要衔接件哦！',
}

/** Check if a part category is allowed in the current step */
export function isCategoryAllowedInStep(category: PartCategory, step: BuildStep): boolean {
  const allowed = STEP_CATEGORIES[step]
  return allowed.includes(category)
}

/** Main compatibility check */
export function canAddPart(part: PartEntry, state: BuildState): CompatibilityResult {
  // Must have hub before anything else
  if (part.category !== 'HUB' && !state.parts.some(p => p.category === 'HUB')) {
    return { ok: false, reason: 'NEED_HUB_FIRST', message: MESSAGES.NEED_HUB_FIRST }
  }

  // Category must match current step
  if (!isCategoryAllowedInStep(part.category, state.currentStep)) {
    return { ok: false, reason: 'WRONG_STEP', message: MESSAGES.WRONG_STEP }
  }

  // HUB: max 1
  if (part.category === 'HUB') {
    const hubCount = state.parts.filter(p => p.category === 'HUB').length
    if (hubCount >= 1) {
      return { ok: false, reason: 'MAX_QUANTITY', message: '只能选一块主板哦！' }
    }
  }

  // ARM: max 8
  if (part.category === 'ARM') {
    const armCount = state.parts.filter(p => p.category === 'ARM').length
    if (armCount >= 8) {
      return { ok: false, reason: 'MAX_QUANTITY', message: MESSAGES.MAX_QUANTITY }
    }
  }

  // DECO: not needed for single-layer hub
  if (part.category === 'DECO' && state.hubLayer === 'single') {
    return { ok: false, reason: 'DECO_NOT_NEEDED', message: MESSAGES.DECO_NOT_NEEDED }
  }

  return { ok: true, reason: 'OK' }
}

/** Check if the current step can advance to next */
export function canAdvanceStep(state: BuildState): { canAdvance: boolean; reason?: string } {
  switch (state.currentStep) {
    case 'HUB':
      return state.parts.some(p => p.category === 'HUB')
        ? { canAdvance: true }
        : { canAdvance: false, reason: '请先选择一块主板' }

    case 'ARM': {
      const armCount = state.parts.filter(p => p.category === 'ARM').length
      return armCount >= 3
        ? { canAdvance: true }
        : { canAdvance: false, reason: `至少需要 3 条机臂（当前 ${armCount} 条）` }
    }

    case 'MOTOR': {
      // Auto-install step: always advanceable
      return { canAdvance: true }
    }

    case 'GUARD': {
      const hasGuard = state.parts.some(p =>
        p.category === 'PLATE' || p.category === 'JOINT' || p.category === 'LAND'
      )
      return hasGuard
        ? { canAdvance: true }
        : { canAdvance: false, reason: '请选择一种保护罩' }
    }

    case 'DECO': {
      // If single layer, auto-skip (should not reach here)
      if (state.hubLayer === 'single') return { canAdvance: true }
      const hasDecos = state.parts.some(p => p.category === 'DECO')
      return hasDecos
        ? { canAdvance: true }
        : { canAdvance: false, reason: '双层主板需要衔接件' }
    }

    case 'REVIEW':
      return { canAdvance: true }

    default:
      return { canAdvance: false }
  }
}

/** Get next step, handling DECO skip for single-layer hubs */
export function getNextStep(currentStep: BuildStep, hubLayer?: 'single' | 'double'): BuildStep | null {
  const idx = BUILD_STEPS.indexOf(currentStep)
  if (idx === -1 || idx >= BUILD_STEPS.length - 1) return null

  const next = BUILD_STEPS[idx + 1] as BuildStep | undefined
  if (!next) return null

  // Skip DECO for single-layer hubs
  if (next === 'DECO' && hubLayer === 'single') {
    return 'REVIEW'
  }

  return next
}

/** Get previous step */
export function getPrevStep(currentStep: BuildStep): BuildStep | null {
  const idx = BUILD_STEPS.indexOf(currentStep)
  if (idx <= 0) return null
  return (BUILD_STEPS[idx - 1] as BuildStep | undefined) ?? null
}
