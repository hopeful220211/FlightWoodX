import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjects, createProject, deleteProject } from '../utils/api'
import type { ProjectData } from '../utils/api'
import { useAuthStore } from '../stores/authStore'

const PROJECTS_KEY = ['projects'] as const

/** Fetch current user's projects (disabled for guests — they have no server-side data) */
export function useProjects() {
  const user = useAuthStore(s => s.user)
  const isGuest = user?.isGuest === true
  const hasToken = useAuthStore(s => !!s.token)

  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async (): Promise<ProjectData[]> => {
      const res = await getProjects()
      if (!res.success) throw new Error(res.error || '获取项目失败')
      return res.data ?? []
    },
    enabled: !isGuest && hasToken, // don't fire for guests or when no JWT
  })
}

/** Create a new project and invalidate the list */
export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await createProject({ name })
      if (!res.success) throw new Error(res.error || '创建项目失败')
      return res.data!
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY })
    },
  })
}

/** Delete a project and invalidate the list */
export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await deleteProject(id)
      if (!res.success) throw new Error(res.error || '删除项目失败')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY })
    },
  })
}
