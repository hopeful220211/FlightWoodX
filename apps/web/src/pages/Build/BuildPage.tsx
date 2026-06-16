/**
 * BuildPage — /build/:id 的占位页。
 *
 * ⚠️ 脚手架：基线快照里 App.tsx 已引用本文件，但文件本身缺失，导致整个应用编译失败。
 * 这是「搭建/Build」P2 页的归属工程师的交付物，此处仅补一个最小占位让 trunk 能编译、
 * 不阻塞设计界面（/design）的开发。归属工程师接手时直接替换本文件即可。
 */
import { useParams } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Card } from '../../components/common/Card'

export function BuildPage() {
  const { id } = useParams()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '我的项目', to: '/projects' },
        { label: '项目详情', to: `/projects/${id}` },
        { label: '搭建' },
      ]} />

      <h1 className="text-2xl font-bold text-ink-900">搭建</h1>

      <Card hoverable={false}>
        <div className="flex flex-col items-center py-10 text-center">
          <Hammer size={40} className="text-sky-400 mb-3" />
          <h3 className="font-semibold text-ink-900">搭建页开发中</h3>
          <p className="text-sm text-ink-400 mt-1">占位页 · 归属工程师接手后替换</p>
        </div>
      </Card>
    </PageContainer>
  )
}
