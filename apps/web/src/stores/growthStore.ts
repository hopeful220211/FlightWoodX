import { create } from 'zustand'
import { ingestGrowthEvents } from '@fwx/shared'
import type { GrowthEvent, GrowthState } from '@fwx/shared'

/**
 * 成长体系「事件摄入 store」（RFC-011-E4）。
 *
 * 持有原始事件流 events，派生态 derived = ingestGrowthEvents(events)（聚合逻辑在 @fwx/shared）。
 * - load(fetcher)：注入事件源（stub 或真实 API），驱动 loading/ready/error 三态。
 * - ingest(e)：🔌 接缝——未来 A/B/D/E 模块发生领域事件时调用它，append 并重算。
 *
 * 空态不入 store：由 status === 'ready' && events.length === 0 在页面侧推导。
 */
export type GrowthStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface GrowthStoreState {
  status: GrowthStatus
  error?: string
  events: GrowthEvent[]
  derived: GrowthState | null
  load: (fetcher: () => Promise<GrowthEvent[]>) => Promise<void>
  ingest: (e: GrowthEvent) => void
  reset: () => void
}

export const useGrowthStore = create<GrowthStoreState>((set, get) => ({
  status: 'idle',
  error: undefined,
  events: [],
  derived: null,

  load: async (fetcher) => {
    set({ status: 'loading', error: undefined })
    try {
      const events = await fetcher()
      set({ status: 'ready', events, derived: ingestGrowthEvents(events) })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : '加载失败', events: [], derived: null })
    }
  },

  ingest: (e) => {
    const events = [...get().events, e]
    // 接缝即入口：即便此前处于 idle/error，ingest 后也置 ready，让页面立即可见
    set({ status: 'ready', error: undefined, events, derived: ingestGrowthEvents(events) })
  },

  reset: () => set({ status: 'idle', error: undefined, events: [], derived: null }),
}))
