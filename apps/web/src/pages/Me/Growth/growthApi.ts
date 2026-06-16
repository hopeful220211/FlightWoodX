import type { GrowthEvent } from '@fwx/shared'
import { SAMPLE_GROWTH_EVENTS } from './growthFixtures'

/**
 * 成长事件源（stub）。模拟异步加载。
 *
 * 🔌 接缝：真实接入时把本函数替换为后端 `GET /api/growth/events`，其余代码不变。
 *
 * 可复现三态（用于验收 / 截图，无需改源码）：
 *   /me/growth?growthStub=empty  → 返回空，触发空态
 *   /me/growth?growthStub=error  → 抛错，触发错误态
 *   默认                          → 返回样例数据
 */
export function fetchGrowthEvents(): Promise<GrowthEvent[]> {
  const mode = new URLSearchParams(window.location.search).get('growthStub')
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (mode === 'error') reject(new Error('成长数据加载失败，请稍后重试'))
      else if (mode === 'empty') resolve([])
      else resolve(SAMPLE_GROWTH_EVENTS)
    }, 400)
  })
}
