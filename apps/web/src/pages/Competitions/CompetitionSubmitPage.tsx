import { useParams, useNavigate } from 'react-router-dom'
import { Upload, ArrowLeft } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'

export function CompetitionSubmitPage() {
  const { id } = useParams()
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '赛事中心', to: '/competitions' },
        { label: '赛事详情', to: `/competitions/${id}` },
        { label: '提交参赛' },
      ]} />

      <h1 className="text-2xl font-bold text-ink-900">提交参赛作品</h1>

      <Card hoverable={false}>
        <div className="flex flex-col items-center py-16 text-center">
          <Upload size={48} className="text-sky-300 mb-4" />
          <h3 className="text-lg font-semibold text-ink-900">选择一个项目提交</h3>
          <p className="text-sm text-ink-400 mt-1 max-w-sm">
            提交后系统会在标准赛道上用 SimAdapter 自动运行你的程序并评分
          </p>
          <Button className="mt-6" disabled>
            选择项目（阶段三 M6 接入）
          </Button>
        </div>
      </Card>
    </PageContainer>
  )
}
