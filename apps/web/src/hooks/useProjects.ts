import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateProject, deleteProject } from '../utils/api'
import type { ProjectData } from '../utils/api'

// 作品库合一（RFC-024 §4.2）：「我的作品」列表已迁到工作台（drone-designs 为真相源），
// 旧的 useProjects（列表查询）与 useCreateProject（空壳新建）已随 /projects 列表退休而移除。
// 这里只保留 ProjectHub 详情页仍在用的「改名 / 删除」项目动作，直到枢纽页整体切设计版。
const PROJECTS_KEY = ['projects'] as const

/** 统一取项目 id（后端用 _id，前端 normalize 后是 id；两者都兜住）。 */
function pidOf(p: ProjectData): string {
  return p.id || (p as unknown as { _id?: string })._id || ''
}

/**
 * 更新项目（改名等）——乐观更新。
 *
 * 关键：详情页改名时，工作台列表（['projects']）通常是「未挂载」的查询，单纯 invalidate
 * 只会把它标记为 stale、并不会立刻重拉；加上 30s staleTime，返回工作台会先看到旧名、
 * 过一会才刷新——这就是「改名迟缓 / 没生效」的根因。所以这里直接 setQueryData 改两个缓存
 * （详情 + 列表），UI 立刻反映；失败回滚；onSettled 再后台对齐服务端。
 */
export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Pick<ProjectData, 'name' | 'visibility' | 'coverUrl'>> }) => {
      const res = await updateProject(id, data)
      if (!res.success) throw new Error(res.error || '更新项目失败')
      return res.data!
    },
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ['project', id] })
      await qc.cancelQueries({ queryKey: PROJECTS_KEY })
      const prevDetail = qc.getQueryData<ProjectData>(['project', id])
      const prevList = qc.getQueryData<ProjectData[]>(PROJECTS_KEY)
      if (prevDetail) qc.setQueryData<ProjectData>(['project', id], { ...prevDetail, ...data })
      if (prevList) {
        qc.setQueryData<ProjectData[]>(
          PROJECTS_KEY,
          prevList.map((p) => (pidOf(p) === id ? { ...p, ...data } : p)),
        )
      }
      return { prevDetail, prevList, id }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      if (ctx.prevDetail) qc.setQueryData(['project', ctx.id], ctx.prevDetail)
      if (ctx.prevList) qc.setQueryData(PROJECTS_KEY, ctx.prevList)
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['project', id] })
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
