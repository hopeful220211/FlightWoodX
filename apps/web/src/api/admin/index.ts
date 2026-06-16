/**
 * 后台 API 适配器入口。
 * 生产构建恒为真实客户端；仅 dev + VITE_ADMIN_API_MODE=mock 时动态加载 mock
 * （动态 import → mock 单独成 chunk，生产 useMock 恒 false，不进生产包）。
 */
import type { AdminApi } from './types'
import { realAdminApi } from './realClient'

const useMock = import.meta.env.DEV && import.meta.env.VITE_ADMIN_API_MODE === 'mock'

let cached: AdminApi | null = null

export async function getAdminApi(): Promise<AdminApi> {
  if (cached) return cached
  if (useMock) {
    const m = await import('./mock/mockClient')
    cached = m.mockAdminApi
  } else {
    cached = realAdminApi
  }
  return cached
}

export type { AdminApi, UserListQuery, PartListQuery, PageQuery } from './types'
