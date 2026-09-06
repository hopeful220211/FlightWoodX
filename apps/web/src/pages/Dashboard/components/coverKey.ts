import type { Design } from '../../../types/design'

/**
 * 缩略图缓存键，同时作为父层重新挂载缩略图用的 React key。
 * Include transforms and source revisions even when timestamps/counts match.
 */
export function coverKeyOf(d: Design): string {
  return `${d.id}:${d.updatedAt}:${JSON.stringify(d.parts)}`
}
