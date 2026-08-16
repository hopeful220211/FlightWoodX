import { useParams } from 'react-router'
import { Wifi, Smartphone } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Card } from '../../components/common/Card'

export function FlyPage() {
  const { id } = useParams()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '工作台', to: '/dashboard' },
        { label: '项目详情', to: `/projects/${id}` },
        { label: '实飞' },
      ]} />

      <h1 className="text-2xl font-bold text-ink-900">实飞控制</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card hoverable={false}>
          <div className="flex flex-col items-center py-10 text-center">
            <Wifi size={40} className="text-sky-400 mb-3" />
            <h3 className="font-semibold text-ink-900">真机适配器</h3>
            <p className="text-sm text-ink-400 mt-1">RealDroneAdapter — 同一份 IR，控制真实无人机</p>
            <p className="text-xs text-ink-400 mt-4">阶段三 M8 · P2 优先级</p>
          </div>
        </Card>
        <Card hoverable={false}>
          <div className="flex flex-col items-center py-10 text-center">
            <Smartphone size={40} className="text-accent-leaf mb-3" />
            <h3 className="font-semibold text-ink-900">AR 试飞</h3>
            <p className="text-sm text-ink-400 mt-1">手机摄像头 + AR 叠加飞行</p>
            <p className="text-xs text-ink-400 mt-4">阶段三 M8 · P2 优先级</p>
          </div>
        </Card>
      </div>
    </PageContainer>
  )
}
