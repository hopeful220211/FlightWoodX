import { BUILD_STEPS } from '@fwx/parts-schema'
import type { Design } from '../../types/design'

/**
 * 作品状态（只用数据里真实存在的信号，不编造）。
 *
 * 设计数据里能可靠区分的只有两种：
 *  - 草稿：引导式还没走到最后一步，或自由模式旧设计。
 *  - 装配完成：引导式已到达最后一步「结构检查」（REVIEW）。
 *
 * 「已编程」不在设计数据里（积木程序另存），故这里不显示，避免虚构。
 */
const LAST_STEP_INDEX = BUILD_STEPS.length - 1

/** 是否已到达最后的结构检查步骤。 */
export function isAssemblyComplete(d: Design): boolean {
  return (d.buildMode ?? 'free') === 'guided' && (d.stepReached ?? 0) >= LAST_STEP_INDEX
}
