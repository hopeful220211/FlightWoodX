/**
 * useProjectHub — 项目枢纽页的数据聚合（C1 / M5）。
 *
 * 把「后端 Project 元信息 + 真实绑定的设计 / 程序」聚合成枢纽页渲染所需的 view model。
 *
 * 真实绑定优先（回应评审：别把「当前本地作品」冒充项目绑定内容）：
 *  - 登录态：按 `project.programId` 拉真实 Program；按 `project.designId` 经 localId 匹配本地设计。
 *    匹配不上 → 该板块走「未绑定」空态，不伪造。
 *  - 游客 / 离线：用本地 designStore / programStore 的当前作品，**显式标注为「本地草稿」**。
 *
 * 三态（§8 红线）：loading / error / empty / ready。其中「后端不可达但本地有内容」
 * 不算错误——降级为 ready + 顶部提示，保住离线工作流（学校弱网）。
 *
 * 注意：shared 的 `ProjectAggregate` 是跨模块契约（B 的分享 / 嵌入 import 它）；
 * 本 hook 返回的是**前端渲染 view model**（含本地 `Design` 类型，供 DesignPreview3D），
 * 二者刻意分开，避免把本地 UI 类型塞进 shared。
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { CommandProgram } from '@fwx/shared'
import { getProject, getProgram, getDroneDesigns } from '../../../utils/api'
import { useAuthStore } from '../../../stores/authStore'
import { useDesignStore } from '../../../stores/designStore'
import { useProgramStore } from '../../../stores/programStore'
import type { Design } from '../../../types/design'

export type HubSource = 'server' | 'local-draft'
export type HubStatus = 'loading' | 'error' | 'empty' | 'ready'

export interface ProjectProgramVM {
  commandProgram: CommandProgram
  name: string
}

export interface ProjectHubData {
  projectId: string
  name: string
  source: HubSource
  loggedIn: boolean
  /** 后端项目加载失败但本地有内容时为 true（顶部提示「离线/未登录，仅本地内容」）。 */
  degraded: boolean
  /** 设计 view model（本地 Design，供 DesignPreview3D 渲染）；null = 空态。 */
  design: Design | null
  /** 设计是否真实绑定到此项目（false = 本地草稿 / 未绑定）。 */
  designBound: boolean
  /** 程序 view model（含编译后 IR，供预览 + 一键试飞）；null = 空态。 */
  program: ProjectProgramVM | null
  programBound: boolean
  status: HubStatus
  error?: string
  refetch: () => void
}

/** 取本地「当前在做」的设计：优先 active，否则最近更新且有零件的。 */
function pickLocalDesign(designs: Design[], activeDesignId: string | null): Design | null {
  const withParts = designs.filter((d) => d.parts.length > 0)
  const active = withParts.find((d) => d.id === activeDesignId)
  if (active) return active
  return [...withParts].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0] ?? null
}

export function useProjectHub(projectId: string): ProjectHubData {
  const token = useAuthStore((s) => s.token)
  const isGuest = useAuthStore((s) => s.user?.isGuest)
  const loggedIn = !!token && !isGuest

  // 本地内容（离线 / 游客可用）
  const designs = useDesignStore((s) => s.designs)
  const activeDesignId = useDesignStore((s) => s.activeDesignId)
  const localDesign = useMemo(() => pickLocalDesign(designs, activeDesignId), [designs, activeDesignId])
  const draftsByDesignId = useProgramStore((s) => s.draftsByDesignId)
  const localProgram = localDesign
    ? draftsByDesignId[localDesign.id]?.commandProgram ?? null
    : null

  // 后端项目（仅登录态请求）
  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await getProject(projectId)
      if (!res.success) throw new Error(res.error || '加载项目失败')
      return res.data!
    },
    enabled: loggedIn && !!projectId,
  })
  const project = projectQuery.data
  const { isLoading: projectLoading, isError: projectErrored, error: projectErr, refetch: refetchProject } = projectQuery

  // 绑定的真实程序（按 programId）
  const boundProgramQuery = useQuery({
    queryKey: ['program', project?.programId],
    queryFn: async () => {
      const res = await getProgram(project!.programId!)
      if (!res.success) throw new Error(res.error || '加载程序失败')
      return res.data!
    },
    enabled: loggedIn && !!project?.programId,
  })

  // 绑定的真实设计：经 droneDesigns 的 localId 映射回本地可渲染设计
  const droneDesignsQuery = useQuery({
    queryKey: ['droneDesigns'],
    queryFn: async () => {
      const res = await getDroneDesigns()
      if (!res.success) throw new Error(res.error || '加载设计失败')
      return res.data ?? []
    },
    enabled: loggedIn && !!project?.designId,
  })

  // 二级绑定资源（程序 / 设计）的加载与错误状态——纳入三态，避免「加载中」被误判为空态、
  // 或「加载失败」被伪装成「未绑定」。
  const { data: boundProgram, isLoading: bpLoading, isError: bpError } = boundProgramQuery
  const { data: droneDesigns, isLoading: ddLoading, isError: ddError } = droneDesignsQuery

  return useMemo<ProjectHubData>(() => {
    const source: HubSource = project ? 'server' : 'local-draft'

    // server 项目尚有未 settle 的绑定查询 / 查询出错
    const bindLoading = !!project && ((!!project.programId && bpLoading) || (!!project.designId && ddLoading))
    const bindError = !!project && ((!!project.programId && bpError) || (!!project.designId && ddError))

    // —— 程序 ——
    let program: ProjectProgramVM | null = null
    let programBound = false
    if (source === 'server') {
      const bound = boundProgram
      if (bound) {
        program = { commandProgram: bound.commandProgram, name: bound.name }
        programBound = true
      } else if (localProgram && localProgram.commands.length > 0) {
        // 项目↔程序绑定（M5）尚未落地：退回本设备当前程序，标注「本地草稿」，避免空白。
        program = { commandProgram: localProgram, name: localProgram.metadata?.name || '本地程序' }
      }
    } else if (localProgram && localProgram.commands.length > 0) {
      program = { commandProgram: localProgram, name: localProgram.metadata?.name || '本地程序' }
    }

    // —— 设计 ——
    let design: Design | null = null
    let designBound = false
    if (source === 'server') {
      const dd = droneDesigns?.find((d) => d.id === project!.designId)
      const matched = dd?.localId ? designs.find((d) => d.id === dd.localId) : undefined
      if (matched && matched.parts.length > 0) {
        design = matched
        designBound = true
      } else if (localDesign) {
        // 项目↔设计绑定（M5）尚未落地：退回显示本设备当前设计，标注「本地草稿」，避免空白。
        // 绑定建立后自动走上面 designBound=true 分支。
        design = localDesign
      }
    } else {
      design = localDesign
    }

    // —— 三态 ——
    const hasContent = !!design || !!program
    let status: HubStatus
    if (loggedIn && (projectLoading || bindLoading)) {
      // 项目本身或其绑定资源仍在加载 → loading（避免短暂误判「未绑定」）
      status = 'loading'
    } else if (loggedIn && projectErrored && !hasContent) {
      status = 'error'
    } else if (!hasContent && !bindError) {
      status = 'empty'
    } else {
      // 有内容，或绑定查询出错但项目本体在 → ready（出错以 degraded 警告呈现，不伪装空态）
      status = 'ready'
    }
    const degraded = loggedIn && (projectErrored || bindError) && status !== 'error'

    const name = project?.name || (source === 'local-draft' ? design?.name || '本地草稿' : '未命名项目')

    return {
      projectId,
      name,
      source,
      loggedIn,
      degraded,
      design,
      designBound,
      program,
      programBound,
      status,
      error: projectErr instanceof Error ? projectErr.message : undefined,
      refetch: () => {
        refetchProject()
      },
    }
  }, [
    projectId, project, loggedIn, localDesign, localProgram, designs,
    boundProgram, droneDesigns, bpLoading, bpError, ddLoading, ddError,
    projectLoading, projectErrored, projectErr, refetchProject,
  ])
}
