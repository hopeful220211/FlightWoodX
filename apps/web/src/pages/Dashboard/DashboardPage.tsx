import { useNavigate } from 'react-router-dom'
import {
  Pencil, Code2, Play, Trophy, Plus, Rocket, BookOpen,
  Loader2, AlertCircle, Clock, GraduationCap, FolderOpen, ArrowRight,
} from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Button } from '../../components/common/Button'
import { useProjects, useCreateProject } from '../../hooks/useProjects'
import { useMeStats } from '../../hooks/useMeStats'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/common/Toast'

const quickActions = [
  { icon: Pencil, label: '新设计', desc: '参数化机身设计', to: '/design' },
  { icon: Code2, label: '积木编程', desc: '拖拽式编程', to: '/code' },
  { icon: Play, label: '仿真试飞', desc: '在浏览器里试飞', to: '/simulator' },
  { icon: Trophy, label: '参加赛事', desc: '线上海选', to: '/competitions' },
]

// 统一的白卡：柔和扩散阴影 + 极细 ring（制造深度，而非纯平浅蓝）
const CARD = 'rounded-xl bg-white shadow-[0_2px_18px_-8px_rgba(23,74,126,0.16)] ring-1 ring-sky-100/80'

export function DashboardPage() {
  const nav = useNavigate()
  const toast = useToast()
  const user = useAuthStore((s) => s.user)
  const isGuest = user?.isGuest

  const { data: projects, isLoading, error } = useProjects()
  const createMutation = useCreateProject()

  const handleCreateProject = async () => {
    try {
      const project = await createMutation.mutateAsync('我的新项目')
      toast.push('success', '项目已创建')
      nav(`/projects/${project.id || (project as unknown as { _id: string })._id}`)
    } catch (e) {
      toast.push('error', e instanceof Error ? e.message : '创建失败')
    }
  }

  const { data: meStats } = useMeStats()
  const projectCount = meStats?.projectCount ?? projects?.length ?? 0

  const fmtMinutes = (m?: number): string | null => {
    if (m == null) return null
    if (m < 60) return `${m} 分钟`
    return `${Math.floor(m / 60)} 时 ${m % 60} 分`
  }

  const stats: { icon: typeof Clock; label: string; value: string | null }[] = [
    { icon: FolderOpen, label: '设计项目', value: String(projectCount) },
    { icon: Clock, label: '学习时长', value: fmtMinutes(meStats?.studyMinutes) },
    { icon: Pencil, label: '设计时长', value: fmtMinutes(meStats?.designMinutes) },
    { icon: GraduationCap, label: '完成课时', value: meStats ? `${meStats.lessonsCompleted}/${meStats.totalLessons}` : null },
  ]

  return (
    <PageContainer className="py-8 space-y-8">
      {/* ── Hero 锚定带：深蓝渐变，承载问候 + 成就数据，给页面分量 ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-sky-800 to-sky-950 px-6 py-7 text-white shadow-[0_24px_60px_-22px_rgba(23,74,126,0.6)] sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-52 w-52 rounded-full bg-sky-300/10 blur-2xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">工作台</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            欢迎回来，{user?.username || '设计师'}
          </h1>
          <p className="mt-1.5 text-sm text-sky-200/90">从一块木头，到一架会飞的无人机。</p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-sky-200">
                  <s.icon size={14} />
                  <span className="text-[11px]">{s.label}</span>
                </div>
                <p className="mt-1 text-xl font-bold tracking-tight">
                  {s.value ?? <span className="text-white/40">—</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 快捷入口：白卡 + 立体图标 + 真实深度 ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => nav(a.to)}
            className="group flex items-center gap-4 rounded-xl bg-white p-5 text-left shadow-[0_2px_16px_-8px_rgba(23,74,126,0.16)] ring-1 ring-sky-100/80 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_22px_44px_-16px_rgba(23,74,126,0.42)] hover:ring-sky-200"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-[0_8px_18px_-6px_rgba(42,136,219,0.6)]">
              <a.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-sky-900">{a.label}</p>
              <p className="mt-0.5 text-xs text-sky-600/70">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── 我的项目 ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-sky-900">我的项目</h2>
          <Button size="sm" variant="ghost" onClick={() => nav('/projects')}>查看全部</Button>
        </div>

        {isGuest ? (
          <div className={`flex flex-col items-center justify-center ${CARD} py-12 text-center`}>
            <Rocket size={36} className="mb-3 text-sky-300" />
            <p className="font-medium text-sky-700">游客模式</p>
            <p className="mt-1 text-sm text-sky-500">注册账号后即可创建和保存项目</p>
            <Button className="mt-4" onClick={() => nav('/auth')} variant="outline">注册账号</Button>
          </div>
        ) : isLoading ? (
          <div className={`flex items-center justify-center ${CARD} py-16`}>
            <Loader2 size={24} className="animate-spin text-sky-400" />
            <span className="ml-2 text-sm text-sky-500">加载中…</span>
          </div>
        ) : error ? (
          <div className={`flex flex-col items-center justify-center ${CARD} py-12 text-center`}>
            <AlertCircle size={32} className="mb-2 text-error" />
            <p className="text-sm text-sky-700">{error instanceof Error ? error.message : '加载失败'}</p>
            <p className="mt-1 text-xs text-sky-500">请检查网络连接后刷新页面</p>
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => {
              const pid = p.id || (p as unknown as { _id: string })._id
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => nav(`/projects/${pid}`)}
                  className={`group flex flex-col overflow-hidden text-left transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_22px_44px_-16px_rgba(23,74,126,0.4)] ${CARD}`}
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-sky-100 to-sky-50">
                    {p.coverUrl ? (
                      <img
                        src={p.coverUrl}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      // 暂无封面：用木质无人机实物图占位（真封面待 B1 截图上传接入）
                      <img
                        src="/resource/picture/UI/web_3.png"
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-contain p-5 opacity-80 transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <div className="border-t border-sky-100/70 p-4">
                    <p className="truncate text-sm font-bold text-sky-900">{p.name}</p>
                    <p className="mt-0.5 text-xs text-sky-500">{new Date(p.updatedAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                </button>
              )
            })}
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={createMutation.isPending}
              className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 text-sm font-medium text-sky-500 transition-all hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                <Plus size={18} />
              </span>
              新建项目
            </button>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center ${CARD} py-16 text-center`}>
            <Rocket size={40} className="mb-3 text-sky-300" />
            <p className="font-medium text-sky-700">还没有项目</p>
            <p className="mt-1 max-w-xs text-sm text-sky-500">创建你的第一个项目，从设计机身开始</p>
            <Button className="mt-4" onClick={handleCreateProject} loading={createMutation.isPending} leftIcon={<Plus size={16} />}>
              新建项目
            </Button>
          </div>
        )}
      </section>

      {/* ── 底部 bento：近期赛事 + 学习中心 并排 ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={`${CARD} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-sky-900">近期赛事</h2>
            <Button size="sm" variant="ghost" onClick={() => nav('/competitions')}>查看全部</Button>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-sky-50/70 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8B530]/15 text-[#E8B530]">
              <Trophy size={20} />
            </span>
            <div>
              <p className="text-sm font-semibold text-sky-900">赛事功能即将开放</p>
              <p className="mt-0.5 text-xs text-sky-500">线上海选，仿真先行，不用买硬件也能比。</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => nav('/learn')}
          className="group relative flex items-center justify-between overflow-hidden rounded-xl bg-gradient-to-br from-sky-600 to-sky-700 p-5 text-left text-white shadow-[0_10px_30px_-14px_rgba(23,74,126,0.55)] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1"
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <BookOpen size={20} />
            </span>
            <div>
              <p className="text-sm font-bold">学习中心</p>
              <p className="mt-0.5 text-xs text-sky-200">12 课时 · 从榫卯到飞行</p>
            </div>
          </div>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 group-hover:translate-x-1">
            <ArrowRight size={16} />
          </span>
        </button>
      </div>
    </PageContainer>
  )
}
