/**
 * useDesignSync — 将 designStore (localStorage) 的设计同步到后端。
 *
 * 策略：localStorage 是主工作区（即时保存、离线可用），后端是持久备份。
 * - 保存时：debounced PATCH 到后端
 * - 首次加载：如果后端有设计但本地没有，拉到本地
 * - 游客模式不同步
 */
import { useCallback, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { createDroneDesign, updateDroneDesign } from '../utils/api'
import { useAuthStore } from '../stores/authStore'
import type { Design } from '../types/design'

/** Map from localId → serverId, persisted in sessionStorage */
const ID_MAP_KEY = 'design-id-map'

function getIdMap(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(ID_MAP_KEY) || '{}') as Record<string, string>
  } catch {
    return {}
  }
}

function setIdMap(localId: string, serverId: string) {
  const map = getIdMap()
  map[localId] = serverId
  sessionStorage.setItem(ID_MAP_KEY, JSON.stringify(map))
}

/**
 * Returns a `saveToServer` function you can call after the design store updates.
 * It will create or update the DroneDesign on the backend.
 */
export function useDesignSync() {
  const token = useAuthStore(s => s.token)
  const isGuest = useAuthStore(s => s.user?.isGuest)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  const saveMutation = useMutation({
    mutationFn: async (design: Design) => {
      const serverId = getIdMap()[design.id]

      const payload = {
        name: design.name,
        parts: design.parts,
        weightG: design.safetyCheck?.totalWeightG ?? 0,
        params: {
          hubType: 'default',
          layer: 'single' as const,
          armCount: design.parts.filter(p => p.category === 'landing').length,
          armLengthMm: 100,
        },
      }

      if (serverId) {
        // Update existing
        await updateDroneDesign(serverId, payload)
      } else {
        // Create new
        const res = await createDroneDesign({ ...payload, localId: design.id })
        if (res.success && res.data) {
          const sid = res.data.id || (res.data as unknown as { _id: string })._id
          if (sid) setIdMap(design.id, sid)
        }
      }
    },
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

  return { saveToServer, isSaving: saveMutation.isPending }
}
