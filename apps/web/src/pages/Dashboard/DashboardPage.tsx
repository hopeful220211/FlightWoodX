import { useNavigate } from 'react-router-dom'
import { Pencil, Code2, Play, Trophy, FolderOpen, Plus, Rocket, BookOpen, Loader2, AlertCircle } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { useProjects, useCreateProject } from '../../hooks/useProjects'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/common/Toast'

const quickActions = [
  { icon: Pencil, label: '新设计', desc: '参数化机身设计', to: '/design', color: 'bg-sky-100 text-sky-600' },
  { icon: Code2, label: '积木编程', desc: '拖拽式编程', to: '/code', color: 'bg-wood-100 text-wood-600' },
  { icon: Play, label: '仿真试飞', desc: '在浏览器里试飞', to: '/simulator', color: 'bg-accent-leaf/20 text-accent-leaf' },
  { icon: Trophy, label: '参加赛事', desc: '线上海选', to: '/competitions', color: 'bg-accent-gold/20 text-accent-gold' },
]

export function DashboardPage() {
  const nav = useNavigate()
  const toast = useToast()
  const user = useAuthStore(s => s.user)
  const isGuest = user?.isGuest

  // Only fetch projects for real users (not guests)
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

  return (
    <PageContainer className="py-8 space-y-8">
      <PageHeader
        title={`欢迎回来，${user?.username || '设计师'}！`}
        description="设计 → 编程 → 仿真 → 参赛，你的飞行创造中枢"
        actions={
          <Button onClick={() => nav('/projects')} leftIcon={<FolderOpen size={16} />} variant="outline">
            我的项目
          </Button>
        }
      />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => nav(a.to)}
            className="group flex items-start gap-4 rounded-xl border border-sky-100/60 bg-white p-5 text-left transition-all hover:shadow-soft hover:-translate-y-0.5"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${a.color}`}>
              <a.icon size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">{a.label}</p>
              <p className="mt-0.5 text-xs text-ink-400">{a.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* My Projects — with loading / error / empty / data states */}
      <Card hoverable={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-900">我的项目</h2>
          <Button size="sm" variant="ghost" onClick={() => nav('/projects')}>查看全部</Button>
        </div>

        {isGuest ? (
          /* Guest mode — no server projects */
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-200 py-12 text-center">
            <Rocket size={36} className="text-sky-300 mb-3" />
            <p className="text-ink-600 font-medium">游客模式</p>
            <p className="text-sm text-ink-400 mt-1">注册账号后即可创建和保存项目</p>
            <Button className="mt-4" onClick={() => nav('/auth')} variant="outline">注册账号</Button>
          </div>
        ) : isLoading ? (
          /* Loading state */
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-sky-400" />
            <span className="ml-2 text-sm text-ink-400">加载中…</span>
          </div>
        ) : error ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center rounded-xl bg-error/5 py-12 text-center">
            <AlertCircle size={32} className="text-error mb-2" />
            <p className="text-sm text-ink-600">{error instanceof Error ? error.message : '加载失败'}</p>
            <p className="text-xs text-ink-400 mt-1">请检查网络连接后刷新页面</p>
          </div>
        ) : projects && projects.length > 0 ? (
          /* Projects list */
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((p) => {
              const pid = p.id || (p as unknown as { _id: string })._id
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => nav(`/projects/${pid}`)}
                  className="flex items-center gap-3 rounded-xl border border-sky-100/60 bg-white p-4 text-left transition hover:shadow-soft hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-500">
                    <FolderOpen size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-400">
                      {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </button>
              )
            })}
            {/* New project card */}
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={createMutation.isPending}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-sky-200 p-4 text-sm text-sky-500 transition hover:bg-sky-50 hover:border-sky-300 disabled:opacity-50"
            >
              <Plus size={16} />
              新建项目
            </button>
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-200 py-16 text-center">
            <Rocket size={40} className="text-sky-300 mb-3" />
            <p className="text-ink-600 font-medium">还没有项目</p>
            <p className="text-sm text-ink-400 mt-1 max-w-xs">创建你的第一个项目，从设计机身开始</p>
            <Button
              className="mt-4"
              onClick={handleCreateProject}
              loading={createMutation.isPending}
              leftIcon={<Plus size={16} />}
            >
              新建项目
            </Button>
          </div>
        )}
      </Card>

      {/* Recent Competitions */}
      <Card hoverable={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-900">近期赛事</h2>
          <Button size="sm" variant="ghost" onClick={() => nav('/competitions')}>查看全部</Button>
        </div>
        <div className="flex items-center gap-4 rounded-xl bg-sky-50/60 p-5">
          <Trophy size={24} className="text-accent-gold shrink-0" />
          <div>
            <p className="font-semibold text-ink-900">赛事功能即将开放</p>
            <p className="text-sm text-ink-400 mt-0.5">线上海选 — 仿真先行，无需硬件</p>
          </div>
        </div>
      </Card>

      {/* Learning shortcut */}
      <button
        type="button"
        onClick={() => nav('/learn')}
        className="flex w-full items-center gap-4 rounded-xl bg-wood-warm p-5 text-left transition hover:shadow-soft"
      >
        <BookOpen size={24} className="text-wood-500 shrink-0" />
        <div>
          <p className="font-semibold text-ink-900">学习中心</p>
          <p className="text-sm text-ink-600">12 课时 · 从榫卯到飞行</p>
        </div>
      </button>
    </PageContainer>
  )
}
