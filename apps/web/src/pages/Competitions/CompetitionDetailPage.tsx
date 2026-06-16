import { useParams, useNavigate } from 'react-router-dom'
import { Trophy, BarChart3, Upload, Users, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'
import {
  useCompetition,
  useRegister,
  COMPETITION_STATUS_LABEL,
  COMPETITION_STATUS_CLASS,
} from '../../hooks/useCompetitions'

const SCORING_LABEL: Record<string, string> = {
  design: '设计',
  programming: '编程逻辑',
  creativity: '创意',
  taskCompletion: '任务完成',
}

export function CompetitionDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: comp, isLoading, isError, error } = useCompetition(id)
  const register = useRegister(id)

  if (isLoading) {
    return (
      <PageContainer className="py-8 space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-sky-50" />
        <div className="h-40 animate-pulse rounded-2xl bg-sky-50" />
      </PageContainer>
    )
  }

  if (isError || !comp) {
    return (
      <PageContainer className="py-8">
        <Card className="text-center py-12">
          <AlertCircle size={28} className="mx-auto text-error mb-2" />
          <p className="text-sm text-ink-600">{(error as Error)?.message || '赛事不存在或加载失败'}</p>
          <Button variant="outline" className="mt-4" onClick={() => nav('/competitions')}>
            返回赛事中心
          </Button>
        </Card>
      </PageContainer>
    )
  }

  const canAct = comp.status === 'open' || comp.status === 'running'

  const handleRegister = () => {
    register.mutate(undefined, {
      onSuccess: () => toast.push('success', '报名成功！'),
      onError: (e) => toast.push('error', (e as Error).message || '报名失败，请先登录'),
    })
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb
        items={[{ label: '赛事中心', to: '/competitions' }, { label: comp.name }]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-ink-900">{comp.name}</h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${COMPETITION_STATUS_CLASS[comp.status]}`}
            >
              {COMPETITION_STATUS_LABEL[comp.status]}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {new Date(comp.startTime).toLocaleDateString()} — {new Date(comp.endTime).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users size={12} />
              {comp.registeredCount} 人报名
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {comp.isRegistered ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-accent-leaf/15 px-3 py-2 text-sm font-medium text-accent-leaf">
              <CheckCircle2 size={16} /> 已报名
            </span>
          ) : (
            <Button onClick={handleRegister} loading={register.isPending} disabled={!canAct}>
              报名参加
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => nav(`/competitions/${id}/submit`)}
            leftIcon={<Upload size={16} />}
            disabled={!canAct}
          >
            提交参赛
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav(`/competitions/${id}/leaderboard`)}
            leftIcon={<BarChart3 size={16} />}
          >
            排行榜
          </Button>
        </div>
      </div>

      {/* 赛制说明 */}
      <Card hoverable={false}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={18} className="text-accent-gold" />
          <h3 className="font-semibold text-ink-900">赛制说明</h3>
        </div>
        <p className="text-sm text-ink-600 whitespace-pre-line">{comp.rulesDescription}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 赛道 */}
        <Card hoverable={false}>
          <h3 className="font-semibold text-ink-900 mb-2">赛道</h3>
          <p className="text-sm font-medium text-ink-700">{comp.trackConfig?.name}</p>
          {comp.trackConfig?.description && (
            <p className="text-xs text-ink-500 mt-1">{comp.trackConfig.description}</p>
          )}
        </Card>

        {/* 评分维度 */}
        <Card hoverable={false}>
          <h3 className="font-semibold text-ink-900 mb-2">评分维度</h3>
          <ul className="space-y-1.5">
            {Object.entries(comp.scoringRules || {}).map(([k, v]) => (
              <li key={k} className="flex items-center justify-between text-sm">
                <span className="text-ink-600">{SCORING_LABEL[k] || k}</span>
                <span className="font-medium text-sky-600">{v as number} 分</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-ink-400 mt-3">自动评分（仿真接入）为后续阶段，当前成绩可由评委录入。</p>
        </Card>
      </div>
    </PageContainer>
  )
}
