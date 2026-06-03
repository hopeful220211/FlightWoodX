import { useNavigate } from 'react-router-dom'
import { Pencil, Code2, Play, Trophy, FolderOpen, Plus, Rocket, BookOpen } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'

const quickActions = [
  { icon: Pencil, label: '新设计', desc: '参数化机身设计', to: '/design', color: 'bg-sky-100 text-sky-600' },
  { icon: Code2, label: '积木编程', desc: '拖拽式编程', to: '/code', color: 'bg-wood-100 text-wood-600' },
  { icon: Play, label: '仿真试飞', desc: '在浏览器里试飞', to: '/simulator', color: 'bg-accent-leaf/20 text-accent-leaf' },
  { icon: Trophy, label: '参加赛事', desc: '线上海选', to: '/competitions', color: 'bg-accent-gold/20 text-accent-gold' },
]

export function DashboardPage() {
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-8">
      <PageHeader
        title="工作台"
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

      {/* My Projects (empty state) */}
      <Card hoverable={false}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink-900">我的项目</h2>
          <Button size="sm" variant="ghost" onClick={() => nav('/projects')}>查看全部</Button>
        </div>
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-sky-200 py-16 text-center">
          <Rocket size={40} className="text-sky-300 mb-3" />
          <p className="text-ink-600 font-medium">还没有项目</p>
          <p className="text-sm text-ink-400 mt-1 max-w-xs">创建你的第一个项目，从设计机身开始</p>
          <Button className="mt-4" onClick={() => nav('/design')} leftIcon={<Plus size={16} />}>
            新建项目
          </Button>
        </div>
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
