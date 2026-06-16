import { useParams } from 'react-router-dom'
import { Heart, GitFork, Share2, ImageOff, User } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useCommunityPost, useToggleLike } from '../../hooks/useCommunity'

export function CommunityPostPage() {
  const { postId } = useParams()
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const { data: post, isLoading, isError, refetch } = useCommunityPost(postId)
  const toggleLike = useToggleLike()

  const onLike = () => {
    if (!post) return
    if (!isLoggedIn) {
      toast.push('info', '登录后才能点赞哦')
      return
    }
    toggleLike.mutate({ id: post.id, liked: post.likedByMe })
  }

  const onShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.push('success', '链接已复制，可以分享给同学了')
    } catch {
      toast.push('info', '复制失败，请手动复制网址')
    }
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb items={[
        { label: '社区', to: '/community' },
        { label: post ? post.title : `作品 #${postId?.slice(0, 6) || '...'}` },
      ]} />

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="aspect-video rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : isError || !post ? (
        <div className="py-16 text-center">
          <p className="text-ink-400">作品不存在或加载失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>重试</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-ink-900">{post.title}</h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={post.likedByMe ? 'primary' : 'outline'}
                leftIcon={<Heart size={14} fill={post.likedByMe ? 'currentColor' : 'none'} />}
                onClick={onLike}
              >
                {post.likeCount}
              </Button>
              <Button size="sm" variant="outline" leftIcon={<GitFork size={14} />} disabled title="Fork 即将上线（P1）">
                Fork
              </Button>
              <Button size="sm" variant="outline" leftIcon={<Share2 size={14} />} onClick={onShare}>分享</Button>
            </div>
          </div>

          {/* fork 血缘（只读） */}
          {post.forkFrom && (
            <p className="text-sm text-ink-400">
              基于 <span className="text-sky-600">@{post.forkFrom.authorName || '某位创作者'}</span> 的《{post.forkFrom.title}》再创作
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* 主体：封面/预览 + 描述 */}
            <Card hoverable={false}>
              <div className="aspect-video -mx-4 -mt-4 mb-4 rounded-t-xl overflow-hidden bg-sky-50 flex items-center justify-center">
                {post.project?.coverUrl ? (
                  <img src={post.project.coverUrl} alt={post.title} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={32} className="text-sky-200" />
                )}
              </div>
              <p className="text-ink-600 whitespace-pre-wrap">
                {post.description || '这位创作者还没有写作品介绍。'}
              </p>
            </Card>

            {/* 侧栏：作者 + 项目 */}
            <div className="space-y-4">
              <Card hoverable={false}>
                <h3 className="font-semibold text-ink-900 mb-3">作者</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center overflow-hidden">
                    {post.author?.avatar ? (
                      <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={18} className="text-sky-400" />
                    )}
                  </div>
                  <span className="text-ink-900 font-medium">{post.author?.username || '匿名创作者'}</span>
                </div>
              </Card>
              <Card hoverable={false}>
                <h3 className="font-semibold text-ink-900 mb-2">作品来源</h3>
                {post.project ? (
                  <ul className="text-sm text-ink-600 space-y-1">
                    <li>项目：{post.project.name}</li>
                    <li className="text-ink-400">{post.project.designId ? '含设计' : '无设计'} · {post.project.programId ? '含程序' : '无程序'}</li>
                  </ul>
                ) : (
                  <p className="text-sm text-ink-400">项目信息缺失</p>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </PageContainer>
  )
}
