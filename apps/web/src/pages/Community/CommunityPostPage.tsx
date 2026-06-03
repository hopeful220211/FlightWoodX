import { useParams, useNavigate } from 'react-router-dom'
import { Heart, GitFork, ArrowLeft, Share2 } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'

export function CommunityPostPage() {
  const { postId } = useParams()
  const nav = useNavigate()

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '社区', to: '/community' },
        { label: `作品 #${postId?.slice(0, 6) || '...'}` },
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink-900">作品详情</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" leftIcon={<Heart size={14} />}>点赞</Button>
          <Button size="sm" variant="outline" leftIcon={<GitFork size={14} />}>Fork</Button>
          <Button size="sm" variant="outline" leftIcon={<Share2 size={14} />}>分享</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Main content */}
        <Card hoverable={false}>
          <div className="aspect-video rounded-xl bg-sky-50 flex items-center justify-center">
            <p className="text-ink-400">作品 3D 预览 / 飞行回放</p>
          </div>
          <div className="mt-4">
            <p className="text-ink-600">作品描述将在阶段三 M7 接入。支持 Fork（复制他人 Project 再创作）。</p>
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card hoverable={false}>
            <h3 className="font-semibold text-ink-900 mb-2">作者信息</h3>
            <p className="text-sm text-ink-400">阶段三 M7 接入</p>
          </Card>
          <Card hoverable={false}>
            <h3 className="font-semibold text-ink-900 mb-2">项目信息</h3>
            <p className="text-sm text-ink-400">设计 + 程序 + 赛事成绩</p>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
