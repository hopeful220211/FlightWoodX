import { useNavigate } from 'react-router-dom'
import { Plus, Rocket } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'

export function ProjectsPage() {
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader
        title="我的项目"
        description="每个项目 = 一个设计 + 一份程序 + 一次试飞"
        actions={
          <Button onClick={() => nav('/design')} leftIcon={<Plus size={16} />}>
            新建项目
          </Button>
        }
      />

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 py-20 text-center">
        <Rocket size={48} className="text-sky-300 mb-4" />
        <h3 className="text-lg font-semibold text-ink-900">还没有项目</h3>
        <p className="text-sm text-ink-400 mt-1 max-w-sm">
          创建你的第一个项目，从设计机身开始，然后用积木编程控制它，最后在模拟器里试飞！
        </p>
        <Button className="mt-6" onClick={() => nav('/design')} leftIcon={<Plus size={16} />}>
          创建第一个项目
        </Button>
      </div>
    </PageContainer>
  )
}
