import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Upload, CheckCircle2, FolderOpen } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'
import { useProjects } from '../../hooks/useProjects'
import { useSubmit, useCompetition } from '../../hooks/useCompetitions'
import { useAuthStore } from '../../stores/authStore'
import type { ProjectData } from '../../utils/api'

const pidOf = (p: ProjectData): string =>
  p.id || (p as unknown as { _id?: string })._id || ''

export function CompetitionSubmitPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: projects, isLoading, isError } = useProjects()
  const { data: comp } = useCompetition(id)
  const submit = useSubmit(id)
  const [selected, setSelected] = useState<string>('')
  const hasToken = useAuthStore((s) => !!s.token)
  const isGuest = useAuthStore((s) => s.user?.isGuest === true)
  const isLoggedIn = hasToken && !isGuest
  const compClosed = comp ? comp.status === 'closed' || comp.status === 'draft' : false
  // 登录但未报名 / 赛事已结束：不让裸提交，前置阻断（后端仍有 403/409 兜底）。
  const blockNotRegistered = isLoggedIn && comp != null && !compClosed && !comp.isRegistered

  const handleSubmit = () => {
    if (!selected) {
      toast.push('error', '请先选择一个作品')
      return
    }
    submit.mutate(selected, {
      onSuccess: () => {
        toast.push('success', '提交成功！作品已进入评审')
        nav(`/competitions/${id}`)
      },
      onError: (e) => toast.push('error', (e as Error).message || '提交失败'),
    })
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: '赛事中心', to: '/competitions' },
          { label: '赛事详情', to: `/competitions/${id}` },
          { label: '提交参赛' },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 lg:text-3xl">
          提交参赛作品
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          选择你的一个作品提交参赛。提交后状态为「已提交」，等待评审录入成绩（自动评分为后续阶段）。
        </p>
      </div>

      <Card hoverable={false}>
        {!isLoggedIn ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderOpen size={40} className="text-sky-300 mb-3" />
            <p className="text-sm text-ink-600">登录后才能提交参赛作品</p>
            <Button variant="outline" className="mt-4" onClick={() => nav('/auth')}>
              去登录
            </Button>
          </div>
        ) : compClosed ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderOpen size={40} className="text-sky-300 mb-3" />
            <p className="text-sm text-ink-600">该赛事已结束，无法提交作品</p>
            <Button variant="outline" className="mt-4" onClick={() => nav(`/competitions/${id}`)}>
              返回赛事详情
            </Button>
          </div>
        ) : blockNotRegistered ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderOpen size={40} className="text-sky-300 mb-3" />
            <p className="text-sm text-ink-600">请先报名本赛事，再来提交作品</p>
            <Button variant="outline" className="mt-4" onClick={() => nav(`/competitions/${id}`)}>
              去报名
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-2 py-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-sky-50" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderOpen size={40} className="text-sky-300 mb-3" />
            <p className="text-sm text-ink-600">作品加载失败，请稍后重试</p>
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FolderOpen size={40} className="text-sky-300 mb-3" />
            <p className="text-sm text-ink-600">你还没有作品，先去工作台创建一个吧</p>
            <Button variant="outline" className="mt-4" onClick={() => nav('/projects')}>
              去我的作品
            </Button>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-ink-900 mb-3">选择一个作品</h3>
            <div className="space-y-2">
              {projects.map((p) => {
                const pid = pidOf(p)
                const active = selected === pid
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setSelected(pid)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-sky-400 bg-sky-50'
                        : 'border-sky-100 hover:border-sky-200 hover:bg-sky-50/50'
                    }`}
                  >
                    <span className="text-sm font-medium text-ink-800">{p.name}</span>
                    {active && <CheckCircle2 size={18} className="text-sky-500" />}
                  </button>
                )
              })}
            </div>
            <div className="mt-5 flex justify-end">
              <Button
                onClick={handleSubmit}
                loading={submit.isPending}
                leftIcon={<Upload size={16} />}
                disabled={!selected}
              >
                确认提交
              </Button>
            </div>
          </>
        )}
      </Card>
    </PageContainer>
  )
}
