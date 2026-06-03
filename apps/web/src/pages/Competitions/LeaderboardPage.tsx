import { useParams } from 'react-router-dom'
import { BarChart3, Medal } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Card } from '../../components/common/Card'

export function LeaderboardPage() {
  const { id } = useParams()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '赛事中心', to: '/competitions' },
        { label: '赛事详情', to: `/competitions/${id}` },
        { label: '排行榜' },
      ]} />

      <h1 className="text-2xl font-bold text-ink-900">排行榜</h1>

      <Card hoverable={false}>
        <div className="flex flex-col items-center py-16 text-center">
          <div className="flex gap-2 mb-4">
            <Medal size={32} className="text-accent-gold" />
            <BarChart3 size={32} className="text-sky-400" />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">暂无排行数据</h3>
          <p className="text-sm text-ink-400 mt-1 max-w-sm">
            评分维度：设计 · 编程逻辑 · 创意 · 任务完成
          </p>
          <p className="text-xs text-ink-400 mt-4">阶段三 M6 接入</p>
        </div>
      </Card>
    </PageContainer>
  )
}
