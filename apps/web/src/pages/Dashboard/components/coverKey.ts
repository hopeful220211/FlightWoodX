import type { Design } from '../../../types/design'

/**
 * 缩略图缓存键，同时作为父层重新挂载缩略图用的 React key。
 * 含 updatedAt + 零件数 → 设计一改即失效，触发重抓封面。
 */
export function coverKeyOf(d: Design): string {
  return `${d.id}:${d.updatedAt}:${d.parts.length}`
}
