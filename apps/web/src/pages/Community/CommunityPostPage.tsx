import { useParams, Link } from 'react-router-dom'
import { Heart, Share2, ImageOff, User, ArrowUpRight, GitFork, Layers, Sparkles } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useCommunityPost, useToggleLike } from '../../hooks/useCommunity'
import { CommentSection } from '../../components/features/community/CommentSection'
import { SaveToCollectionButton } from '../../components/features/community/SaveToCollectionButton'
import { ReuseButton } from '../../components/features/community/ReuseButton'

// 局部入场动画：MasonryGrid 的 fwxRise 仅在其渲染时注入，这里自带一份，独立可用。
const RISE_KEYFRAMES =
  '@keyframes fwxPostRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'

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
    <PageContainer className="py-8 lg:py-10">
      <style>{RISE_KEYFRAMES}</style>

      <Breadcrumb
        items={[
          { label: '社区', to: '/community' },
          { label: post ? post.title : `作品 #${postId?.slice(0, 6) || '...'}` },
        ]}
      />

      {isLoading ? (
        <PostSkeleton />
      ) : isError || !post ? (
        <div className="mt-8 rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 py-20 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
            <ImageOff size={24} className="text-sky-300" />
          </div>
          <p className="text-ink-500">作品不存在或加载失败了</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            重试
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-8 motion-safe:animate-[fwxPostRise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]">
          {/* ── Hero：大封面 + 标题 + 操作条 ── */}
          <section className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-sky-50 via-sky-100/50 to-white">
              {post.project?.coverUrl ? (
                <img
                  src={post.project.coverUrl}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageOff size={40} className="text-sky-200" />
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/15 to-transparent" />
            </div>

            <div className="p-5 sm:p-6 lg:p-7">
              {/* fork 血缘（只读 chip） */}
              {post.forkFrom && (
                <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 ring-1 ring-sky-100">
                  <GitFork size={12} className="shrink-0" />
                  <span className="truncate">
                    基于 @{post.forkFrom.authorName || '某位创作者'} 的《{post.forkFrom.title}》再创作
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl">
                    {post.title}
                  </h1>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-400">
                    <Heart size={13} className="text-rose-400" fill="currentColor" />
                    {post.likeCount} 人喜欢这件作品
                  </p>
                </div>

                {/* 操作条：点赞 / 收藏 / 复用 / 分享 */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onLike}
                    aria-pressed={post.likedByMe}
                    aria-label={post.likedByMe ? '取消点赞' : '点赞'}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold shadow-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
                      post.likedByMe
                        ? 'bg-rose-500 text-white shadow-soft hover:bg-rose-600'
                        : 'border border-sky-200 bg-white text-ink-700 hover:border-rose-200 hover:text-rose-500'
                    }`}
                  >
                    <Heart
                      size={15}
                      fill={post.likedByMe ? 'currentColor' : 'none'}
                      className={post.likedByMe ? 'motion-safe:animate-[fwxPostRise_0.3s_ease-out]' : ''}
                    />
                    {post.likeCount}
                  </button>
                  <SaveToCollectionButton postId={post.id} />
                  {post.project && (
                    <ReuseButton
                      postId={post.id}
                      projectId={post.project.id}
                      reusable={post.project.reusable}
                    />
                  )}
                  <button
                    type="button"
                    onClick={onShare}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-sky-200 bg-white px-4 text-sm font-semibold text-ink-700 shadow-sm transition-all duration-300 active:scale-95 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <Share2 size={15} />
                    分享
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── 主体 + 侧栏 ── */}
          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            {/* 作品介绍 */}
            <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sky-100 sm:p-6">
              <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
                <Sparkles size={17} className="text-sky-500" />
                作品介绍
              </h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-ink-600">
                {post.description || '这位创作者还没有写作品介绍，但作品本身已经在说话啦。'}
              </p>
            </section>

            {/* 侧栏：作者 + 作品来源 */}
            <aside className="space-y-6">
              {/* 作者卡 */}
              <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sky-100">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">创作者</h3>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-sky-200/60 ring-1 ring-sky-100">
                    {post.author?.avatar ? (
                      <img src={post.author.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <User size={20} className="text-sky-500" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    {post.author ? (
                      <>
                        <Link
                          to={`/u/${post.author.id}`}
                          className="block truncate font-semibold text-ink-900 transition-colors hover:text-sky-600"
                        >
                          {post.author.username}
                        </Link>
                        <Link
                          to={`/u/${post.author.id}`}
                          className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-sky-500 transition-colors hover:text-sky-600"
                        >
                          查看主页 <ArrowUpRight size={12} />
                        </Link>
                      </>
                    ) : (
                      <span className="font-semibold text-ink-900">匿名创作者</span>
                    )}
                  </div>
                </div>
              </section>

              {/* 作品来源 / 项目 */}
              <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sky-100">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">
                  <Layers size={13} className="text-sky-400" />
                  作品来源
                </h3>
                {post.project ? (
                  <div className="mt-3 space-y-3">
                    <p className="truncate font-medium text-ink-900">{post.project.name}</p>
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          post.project.designId
                            ? 'bg-sky-50 text-sky-600 ring-sky-100'
                            : 'bg-paper-50 text-ink-400 ring-sky-100/60'
                        }`}
                      >
                        {post.project.designId ? '含 3D 设计' : '无 3D 设计'}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                          post.project.programId
                            ? 'bg-sky-50 text-sky-600 ring-sky-100'
                            : 'bg-paper-50 text-ink-400 ring-sky-100/60'
                        }`}
                      >
                        {post.project.programId ? '含飞行程序' : '无飞行程序'}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-ink-400">
                      <GitFork size={12} className="text-sky-300" />
                      {post.project.reusable ? '作者已开放复用，欢迎改造' : '作者暂未开放复用'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink-400">项目信息缺失</p>
                )}
              </section>
            </aside>
          </div>

          {/* 评论区（RFC-017 P1 · 评论 + 举报） */}
          <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sky-100 sm:p-6">
            <CommentSection postId={post.id} />
          </section>
        </div>
      )}
    </PageContainer>
  )
}

/** 详情骨架屏：与正式布局同构，避免加载→渲染的跳动。 */
function PostSkeleton() {
  return (
    <div className="mt-6 space-y-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
        <div className="aspect-video w-full animate-pulse bg-sky-50" />
        <div className="space-y-4 p-6">
          <div className="h-7 w-2/3 animate-pulse rounded-lg bg-sky-50" />
          <div className="flex gap-2">
            <div className="h-11 w-20 animate-pulse rounded-full bg-sky-50" />
            <div className="h-11 w-20 animate-pulse rounded-full bg-sky-50" />
            <div className="h-11 w-28 animate-pulse rounded-full bg-sky-50" />
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="h-40 animate-pulse rounded-2xl bg-sky-50" />
        <div className="space-y-6">
          <div className="h-28 animate-pulse rounded-2xl bg-sky-50" />
          <div className="h-32 animate-pulse rounded-2xl bg-sky-50" />
        </div>
      </div>
    </div>
  )
}
