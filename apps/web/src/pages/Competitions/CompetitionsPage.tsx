import { useNavigate } from 'react-router-dom'
import { Trophy, Calendar, Users, ArrowRight } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'

const sampleCompetitions = [
  {
    id: 'demo-2026-summer',
    name: '2026 翼创未来 · 暑期线上海选',
    desc: '仿真先行，无需硬件。设计 → 编程 → 仿真 → 自动评分。',
    status: '即将开放' as const,
    dateRange: '2026年7月 — 2026年8月',
    participants: 0,
  },
  {
    id: 'demo-2026-fall',
    name: '2026 翼创未来 · 秋季区域赛',
    desc: '凭线上海选成绩晋级。线下实飞 + 答辩。',
    status: '筹备中' as const,
    dateRange: '2026年10月',
    participants: 0,
  },
]

const statusColor = {
  '即将开放': 'bg-accent-gold/20 text-accent-gold',
  '筹备中': 'bg-sky-100 text-sky-600',
  '进行中': 'bg-accent-leaf/20 text-accent-leaf',
  '已结束': 'bg-ink-100 text-ink-400',
}

export function CompetitionsPage() {
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader
        title="赛事中心"
        description="仿真先行 — 孩子无需任何硬件，就能在浏览器里完成设计 + 编程 + 参赛"
      />

      {/* Competition list */}
      <div className="grid gap-5">
        {sampleCompetitions.map((comp) => (
          <Card key={comp.id} className="cursor-pointer" onClick={() => nav(`/competitions/${comp.id}`)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={18} className="text-accent-gold" />
                  <h3 className="text-lg font-semibold text-ink-900">{comp.name}</h3>
                </div>
                <p className="text-sm text-ink-600">{comp.desc}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
                  <span className="inline-flex items-center gap-1"><Calendar size={12} />{comp.dateRange}</span>
                  <span className="inline-flex items-center gap-1"><Users size={12} />{comp.participants} 人报名</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusColor[comp.status]}`}>
                  {comp.status}
                </span>
                <ArrowRight size={16} className="text-ink-300" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  )
}
