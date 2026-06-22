import type { GrowthState, LeaderboardEntry, LeaderboardScope } from '@fwx/shared'
import { apiFetch, getProjects } from '../../../utils/api'

/**
 * 成长页数据源 · 真连库（RFC-011-E4）。
 *
 * 后端为服务端权威:`GET /api/growth/events` 直接返回聚合好的 `GrowthState`
 * (totalPoints / 层级 / 徽章 / recentEvents),前端不再客户端 ingest。
 * `GET /api/growth/leaderboard` 返回分页榜单。作品 Tab 复用现有 `getProjects`。
 */

/** 后端 /events 返回:GrowthState + 数据可得性说明(诚实标注哪些信号真实派生)。 */
export type GrowthStateResponse = GrowthState & {
  dataAvailability?: Record<string, unknown>
}

/** 拉取当前用户的成长状态(服务端已聚合)。 */
export async function fetchGrowthState(): Promise<GrowthStateResponse> {
  const res = await apiFetch<GrowthStateResponse>('/growth/events')
  if (!res.success || !res.data) {
    throw new Error(res.error || '成长数据加载失败,请稍后重试')
  }
  return res.data
}

/** 排行榜分页结果。 */
export interface LeaderboardPage {
  items: LeaderboardEntry[]
  total: number
  page: number
  pageSize: number
  /** scope=class 退化为同年级榜等情形的如实说明。 */
  scopeNote?: string
}

/** 拉取成长排行榜(全站 / 班级)。 */
export async function fetchLeaderboard(
  scope: LeaderboardScope,
  page = 1,
  pageSize = 20,
): Promise<LeaderboardPage> {
  const res = await apiFetch<LeaderboardPage>(
    `/growth/leaderboard?scope=${scope}&page=${page}&pageSize=${pageSize}`,
  )
  if (!res.success || !res.data) {
    throw new Error(res.error || '排行榜加载失败')
  }
  return res.data
}

/** 作品 Tab 用:当前用户的作品,映射为展示用最小形状。 */
export async function fetchMyProjects(): Promise<{ id: string; name: string; thumbnailUrl?: string }[]> {
  const res = await getProjects()
  if (!res.success || !res.data) return []
  return res.data.map((p) => ({ id: p.id, name: p.name, thumbnailUrl: p.coverUrl }))
}
