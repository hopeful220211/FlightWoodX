import { create } from 'zustand'
import type { GrowthState } from '@fwx/shared'

/**
 * 成长体系 store（RFC-011-E4）· 真连库。
 *
 * 后端为服务端权威:`GET /api/growth/events` 直接返回聚合好的 `GrowthState`,
 * 故 store 只持有该派生态、不在客户端 ingest。
 * - load(fetcher)：注入数据源(真实 API),驱动 loading/ready/error 三态。
 */
export type GrowthStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface GrowthStoreState {
  status: GrowthStatus
  error?: string
  derived: GrowthState | null
  load: (fetcher: () => Promise<GrowthState>) => Promise<void>
  reset: () => void
}

export const useGrowthStore = create<GrowthStoreState>((set) => ({
  status: 'idle',
  error: undefined,
  derived: null,

  load: async (fetcher) => {
    set({ status: 'loading', error: undefined })
    try {
      const derived = await fetcher()
      set({ status: 'ready', derived })
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : '加载失败', derived: null })
    }
  },

  reset: () => set({ status: 'idle', error: undefined, derived: null }),
}))
