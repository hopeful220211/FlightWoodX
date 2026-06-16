import { useQuery } from '@tanstack/react-query'
import { getMyStats } from '../utils/api'
import type { MeStats } from '../utils/api'
import { useAuthStore } from '../stores/authStore'

const ME_STATS_KEY = ['me-stats'] as const

/** 我的成就统计（工作台顶部）。游客 / 未登录不触发——他们没有服务端数据。 */
export function useMeStats() {
  const user = useAuthStore(s => s.user)
  const isGuest = user?.isGuest === true
  const hasToken = useAuthStore(s => !!s.token)

  return useQuery({
    queryKey: ME_STATS_KEY,
    queryFn: async (): Promise<MeStats> => {
      const res = await getMyStats()
      if (!res.success) throw new Error(res.error || '获取成就数据失败')
      return res.data!
    },
    enabled: !isGuest && hasToken,
  })
}
