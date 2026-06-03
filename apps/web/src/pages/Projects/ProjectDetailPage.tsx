import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Code2, Play, Download, Share2 } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'

export function ProjectDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '我的项目', to: '/projects' },
        { label: `项目 #${id?.slice(0, 6) || '...'}` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">项目详情</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={<Share2 size={14} />}>分享</Button>
          <Button size="sm" variant="outline" leftIcon={<Download size={14} />}>导出</Button>
        </div>
      </div>

      {/* Action cards: Design / Code / Simulate */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer" onClick={() => nav(`/design/${id}`)}>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-100 text-sky-600 mb-3">
              <Pencil size={24} />
            </div>
            <p className="font-semibold text-ink-900">设计</p>
            <p className="text-sm text-ink-400 mt-1">编辑机身</p>
          </div>
        </Card>
        <Card className="cursor-pointer" onClick={() => nav(`/code/${id}`)}>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-wood-100 text-wood-600 mb-3">
              <Code2 size={24} />
            </div>
            <p className="font-semibold text-ink-900">编程</p>
            <p className="text-sm text-ink-400 mt-1">积木编程</p>
          </div>
        </Card>
        <Card className="cursor-pointer" onClick={() => nav(`/simulator/${id}`)}>
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-leaf/20 text-accent-leaf mb-3">
              <Play size={24} />
            </div>
            <p className="font-semibold text-ink-900">试飞</p>
            <p className="text-sm text-ink-400 mt-1">仿真试飞</p>
          </div>
        </Card>
      </div>

      {/* Placeholder for project data */}
      <Card hoverable={false}>
        <div className="py-12 text-center text-ink-400">
          <p className="font-medium">项目数据将在阶段三（M5）接入</p>
          <p className="text-sm mt-1">设计 + 程序 + 试飞闭环</p>
        </div>
      </Card>
    </PageContainer>
  )
}
