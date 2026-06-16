/**
 * useDesignSync — 将 designStore (localStorage) 的设计同步到后端。
 *
 * 策略：localStorage 是主工作区（即时保存、离线可用），后端是持久备份。
 * - 保存时：debounced PUT 幂等 upsert（按 localId=design.id），存整份 Design 快照
 * - 进入设计页：loadFromServer 把账号里的设计拉回本地（跨设备/新设备还原）
 * - 游客模式不同步
 */
import { useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getDroneDesigns, putDroneDesign } from '../utils/api'
import { useAuthStore } from '../stores/authStore'
import { useDesignStore } from '../stores/designStore'
import type { Design } from '../types/design'

/**
 * Returns `saveToServer`（debounced 幂等保存）和 `loadFromServer`（跨设备回填）。
 */
export function useDesignSync() {
  const token = useAuthStore(s => s.token)
  const isGuest = useAuthStore(s => s.user?.isGuest)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const saveMutation = useMutation({
    mutationFn: async (design: Design) =>
      putDroneDesign({
        localId: design.id, // design.id 稳定，跨设备同一份设计始终命中同一条后端记录
        name: design.name,
        designData: design, // 整份快照，原样还原
        weightG: design.safetyCheck?.totalWeightG ?? 0,
      }),
  })

  /** Debounced save — call this whenever the design changes. */
  const saveToServer = useCallback(
    (design: Design) => {
      // Don't sync for guests or without token
      if (isGuest || !token) return

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        saveMutation.mutate(design)
      }, 2000) // 2s debounce — don't spam the server while user is dragging parts
    },
    [isGuest, token, saveMutation],
  )

  /** 从账号拉回设计并合并进本地（进入设计页时调用一次）。 */
  const loadFromServer = useCallback(async () => {
    if (isGuest || !token) return
    const res = await getDroneDesigns()
    if (!res.success || !res.data) return
    const designs = res.data
      .map(r => r.designData)
      .filter((d): d is Design =>
        !!d && typeof d === 'object' && typeof (d as Design).id === 'string' && Array.isArray((d as Design).parts),
      )
    if (designs.length > 0) {
      useDesignStore.getState().importServerDesigns(designs)
    }
  }, [isGuest, token])

  return { saveToServer, loadFromServer, isSaving: saveMutation.isPending }
}
