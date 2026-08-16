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
import type { PartInstance } from '../types/design'

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

/**
 * 计算一份设计里所有「已被占用」的连接点。
 *
 * 关键：一次连接成立时会**同时用掉两个连接点**——
 *   - 父件上被插入的那个卡口：`${parentInstanceId}::${parentConnectorId}`
 *   - 子件上用来插入的那个卡口：`${childInstanceId}::${activeConnectorId}`
 *
 * 过去各处只标记了父件那一侧，子件那个已经物理插住的卡口被当成空闲，
 * 于是后续零件会吸附到它上面（它正好和父件卡口同一个位置）→ 两个零件几何重叠。
 * 这里把两侧都标记上，匹配 / 高亮 / 吸附 / 合法性检查统一从这个集合排除已占用卡口。
 *
 * 返回的 Set 元素格式统一为 `${instanceId}::${connectorId}`，与各处构造匹配 key 时一致。
 */
export function computeOccupiedConnectors(parts: PartInstance[]): Set<string> {
  const occupied = new Set<string>()
  for (const inst of parts) {
    const at = inst.attachedTo
    if (!at?.parentInstanceId || !at.parentConnectorId) continue
    // 父件被用掉的卡口
    occupied.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
    // 子件被用掉的卡口（之前漏标的一侧，是「已占用仍被当空闲」重叠 bug 的根因）
    if (inst.activeConnectorId) {
      occupied.add(`${inst.instanceId}::${inst.activeConnectorId}`)
    }
  }
  return occupied
}
