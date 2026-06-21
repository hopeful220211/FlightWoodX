/**
 * 赛事数据 hooks（RFC-018 P0）。封装 /api/competitions/* 拉取与动作。
 * 实体类型一律 import 自 @fwx/shared（RFC-016 护栏#1），仅在此加视图字段。
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../utils/api'
import { useAuthStore } from '../stores/authStore'
import type { Competition, Paginated, ScoreDimensions, ScoreSource } from '@fwx/shared'

/** 列表/详情视图：赛事 + 报名数（+ 详情带是否已报名） */
export interface CompetitionView extends Competition {
  registeredCount: number
  isRegistered?: boolean
}

export interface LeaderboardEntry {
  rank: number
  submissionId: string
  userId: string
  userName: string
  projectId: string
  projectName: string
  total: number
  dimensions: ScoreDimensions
  source: ScoreSource
}

export function useCompetitions(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['competitions', page, pageSize],
    queryFn: async () => {
      const res = await apiFetch<Paginated<CompetitionView>>(
        `/competitions?page=${page}&pageSize=${pageSize}`,
      )
      if (!res.success) throw new Error(res.error)
      return res.data as Paginated<CompetitionView>
    },
  })
}

export function useCompetition(id?: string) {
  // 详情含用户专属 isRegistered，缓存须按账号隔离，否则切号会串报名状态。
  const authScope = useAuthStore((s) => s.user?.id ?? 'anon')
  return useQuery({
    queryKey: ['competition', id, authScope],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiFetch<{ competition: CompetitionView }>(`/competitions/${id}`)
      if (!res.success) throw new Error(res.error)
      return (res.data as { competition: CompetitionView }).competition
    },
  })
}

export function useLeaderboard(id?: string, page = 1) {
  return useQuery({
    queryKey: ['leaderboard', id, page],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiFetch<Paginated<LeaderboardEntry>>(
        `/competitions/${id}/leaderboard?page=${page}`,
      )
      if (!res.success) throw new Error(res.error)
      return res.data as Paginated<LeaderboardEntry>
    },
  })
}

export function useRegister(id?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ registered: boolean; registeredCount: number }>(
        `/competitions/${id}/register`,
        { method: 'POST' },
      )
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competition', id] })
      qc.invalidateQueries({ queryKey: ['competitions'] })
    },
  })
}

export function useSubmit(id?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiFetch<{ submission: unknown; reused?: boolean }>(
        `/competitions/${id}/submit`,
        { method: 'POST', body: JSON.stringify({ projectId }) },
      )
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['competition', id] })
      qc.invalidateQueries({ queryKey: ['leaderboard', id] })
    },
  })
}

/** 赛事状态 → 中文标签 + 样式 */
export const COMPETITION_STATUS_LABEL: Record<Competition['status'], string> = {
  draft: '筹备中',
  open: '报名中',
  running: '进行中',
  closed: '已结束',
}

export const COMPETITION_STATUS_CLASS: Record<Competition['status'], string> = {
  draft: 'bg-ink-100 text-ink-400',
  open: 'bg-accent-gold/20 text-accent-gold',
  running: 'bg-accent-leaf/20 text-accent-leaf',
  closed: 'bg-ink-100 text-ink-400',
}
