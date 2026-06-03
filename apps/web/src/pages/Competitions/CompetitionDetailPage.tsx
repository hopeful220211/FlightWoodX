import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Trophy, BarChart3, Upload } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'

export function CompetitionDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '赛事中心', to: '/competitions' },
        { label: `赛事 #${id?.slice(0, 8) || '...'}` },
      ]} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">赛事详情</h1>
          <p className="text-sm text-ink-400 mt-1">仿真先行 · 设计 / 编程 / 创意 / 任务完成四维评分</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => nav(`/competitions/${id}/submit`)} leftIcon={<Upload size={16} />}>
            提交参赛
          </Button>
          <Button variant="outline" onClick={() => nav(`/competitions/${id}/leaderboard`)} leftIcon={<BarChart3 size={16} />}>
            排行榜
          </Button>
        </div>
      </div>

      {/* Competition info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card hoverable={false}>
          <div className="text-center py-6">
            <Trophy size={28} className="mx-auto text-accent-gold mb-2" />
            <p className="font-semibold text-ink-900">赛制说明</p>
            <p className="text-xs text-ink-400 mt-1">评设计 · 评编程逻辑 · 评创意 · 评任务完成</p>
          </div>
        </Card>
        <Card hoverable={false}>
          <div className="text-center py-6">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-600 mb-2">3D</div>
            <p className="font-semibold text-ink-900">赛道配置</p>
            <p className="text-xs text-ink-400 mt-1">障碍物 · 任务点 · 传感器交互</p>
          </div>
        </Card>
        <Card hoverable={false}>
          <div className="text-center py-6">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-accent-leaf/20 text-accent-leaf mb-2">IR</div>
            <p className="font-semibold text-ink-900">自动评分</p>
            <p className="text-xs text-ink-400 mt-1">SimAdapter 标准赛道 · RunResult 自动计分</p>
          </div>
        </Card>
      </div>

      <Card hoverable={false}>
        <div className="py-10 text-center text-ink-400">
          <p className="font-medium">赛事详细数据将在阶段三 M6 接入</p>
        </div>
      </Card>
    </PageContainer>
  )
}
