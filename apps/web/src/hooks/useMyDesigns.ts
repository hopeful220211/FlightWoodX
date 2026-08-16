/**
 * useMyDesigns — 工作台「我的作品」的服务器真相源（RFC-024 §4.2 作品库合一）。
 *
 * 之前工作台只读本地 designStore，服务器那份（drone-designs）只在进设计页时被 loadFromServer
 * 拉回、且**只取了 designData 快照、丢掉了服务器 id / coverUrl / visibility / reuseCount**。
 * 合一后这些元信息是命门（发布 / 封面 / 公开状态全靠 localId → 服务器 id 的映射），不能再丢。
 *
 * 本 hook：
 *  - 用 TanStack Query 拉 GET /drone-designs 的**完整记录**（含上述元信息），作为工作台真相源；
 *  - 顺带把每条的 designData 快照合并进本地 designStore（离线缓存 + 墓碑），供离线渲染 / 3D 预览；
 *  - 游客 / 未登录不请求（本地即全部）。
 *
 * 渲染仍从 designStore 出（离线可用）；本 hook 的 records 只用来「按 localId 找服务器记录」。
 */
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDroneDesigns } from '../utils/api'
import type { DroneDesignData } from '../utils/api'
import { useAuthStore } from '../stores/authStore'
import { useDesignStore } from '../stores/designStore'
import { DroneDesignSnapshotSchema } from '@fwx/parts-schema'

export const MY_DESIGNS_KEY = ['myDesigns'] as const

/**
 * 返回当前用户的服务器作品记录 + 一个「localId → 记录」映射（供发布 / 封面按 localId 取服务器 id）。
 * 同时把服务器快照合并进本地 designStore（离线缓存）。
 */
export function useMyDesigns() {
  const token = useAuthStore((s) => s.token)
  const isGuest = useAuthStore((s) => s.user?.isGuest)
  const loggedIn = !!token && !isGuest

  const query = useQuery({
    queryKey: MY_DESIGNS_KEY,
    queryFn: async (): Promise<DroneDesignData[]> => {
      const res = await getDroneDesigns()
      if (!res.success) throw new Error(res.error || '加载作品失败')
      return res.data ?? []
    },
    enabled: loggedIn,
  })

  const records = query.data

  // 合并服务器快照进本地（离线缓存）。放在 effect 里而非 queryFn，避免在渲染/请求期做副作用。
  useEffect(() => {
    if (!records || records.length === 0) return
    const designs = records.flatMap((record) => {
      const parsed = DroneDesignSnapshotSchema.safeParse(record.designData)
      return parsed.success ? [parsed.data] : []
    })
    if (designs.length > 0) {
      useDesignStore.getState().importServerDesigns(designs)
    }
  }, [records])

  // localId → 服务器记录（发布 / 封面靠它把本地作品对上服务器 id）
  const byLocalId = new Map<string, DroneDesignData>()
  for (const r of records ?? []) {
    if (r.localId) byLocalId.set(r.localId, r)
  }

  return { records, byLocalId, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch }
}
