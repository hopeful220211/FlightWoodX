/**
 * Category-based connection rules (from RFC-008 Appendix B).
 * Determines which part categories can connect to which.
 *
 * Rule: "what sockets on parent can accept what child category"
 *
 *   mainboard sockets → accept landing, joint
 *   landing sockets   → accept guard, mainboard (dual-mainboard via landing)
 *   guard sockets     → accept nothing (terminal)
 *   joint sockets     → accept mainboard (dual-mainboard via deco connector)
 */

import type { PartCategory } from '@fwx/parts-schema'

const COMPATIBILITY: Record<string, PartCategory[]> = {
  mainboard: ['landing', 'joint'],
  landing: ['guard', 'mainboard'],
  guard: [],
  joint: ['mainboard'],
}

/**
 * Check if a child part category can connect to a parent part category.
 * Used by SocketHighlights to filter visible snap points,
 * and by designStore.addPartSmart to validate connections.
 */
export function isConnectionAllowed(childCategory: string, parentCategory: string): boolean {
  const accepted = COMPATIBILITY[parentCategory]
  if (!accepted) return false
  return accepted.includes(childCategory as PartCategory)
}
