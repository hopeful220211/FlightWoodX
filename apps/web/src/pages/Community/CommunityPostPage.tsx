import { Suspense, useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import {
  Heart,
  Share2,
  ImageOff,
  User,
  ArrowUpRight,
  ArrowLeft,
  GitFork,
  Move3d,
  Sparkles,
  Boxes,
} from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { useCommunityPost, useToggleLike } from '../../hooks/useCommunity'
import { CommunityShell } from '../../components/features/community/CommunityShell'
import { CommentSection } from '../../components/features/community/CommentSection'
import { SaveToCollectionButton } from '../../components/features/community/SaveToCollectionButton'
import { ReuseButton } from '../../components/features/community/ReuseButton'
import { LikeButton } from '../../components/features/community/LikeButton'
import { AssembledDrone } from '../../components/design/AssembledDrone'
import { PartsList } from '../ExportPreview/PartsList'

// 局部入场动画：自带一份关键帧，独立可用，不依赖其它组件注入。
const RISE_KEYFRAMES =
  '@keyframes fwxPostRise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}'

/** 是否系统级降低动效——用于关闭 3D 自动旋转与入场动画。 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function CommunityPostPage() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)
  const reducedMotion = usePrefersReducedMotion()

  const { data: post, isLoading, isError, refetch } = useCommunityPost(postId)
  const toggleLike = useToggleLike()

  const onBack = () => {
    // 按钮语义就是「返回作品广场」：直达 /community，稳妥可预期（history.length 不保证上一页是社区，
    // 直链/外链进来时 navigate(-1) 可能把人带出站，Codex 评审）。
    navigate('/community')
  }

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

  // 客户端兜底过滤（Codex）：即使后端清洗过，也再挡一层脏零件，避免 [null]/缺字段让 3D 组件崩溃。
  const safeParts = (post?.design?.parts ?? []).filter(
    (p) => p && typeof p === 'object' && Array.isArray(p.position) && p.position.length === 3,
  )
  const hasModel = safeParts.length > 0
  const riseClass = reducedMotion
    ? ''
    : 'motion-safe:animate-[fwxPostRise_0.55s_cubic-bezier(0.22,1,0.36,1)_both]'

  return (
    <CommunityShell>
      <PageContainer className="py-6 lg:py-10">
        <style>{RISE_KEYFRAMES}</style>

        {/* ── 醒目的返回箭头（不是面包屑） ── */}
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className="group inline-flex items-center gap-2 rounded-full bg-white/80 py-2 pl-2 pr-4 text-sm font-semibold text-black/70 shadow-soft ring-1 ring-black/5 backdrop-blur transition-all duration-300 hover:-translate-x-0.5 hover:bg-white hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-500 transition-colors group-hover:bg-sky-100">
            <ArrowLeft size={17} />
          </span>
          返回作品广场
        </button>

        {isLoading ? (
          <PostSkeleton />
        ) : isError || !post ? (
          <div className="mt-8 rounded-2xl border border-dashed border-sky-200 bg-white/50 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-sky-100">
              <ImageOff size={24} className="text-sky-300" />
            </div>
            <p className="text-black/55">作品不存在或加载失败了</p>
            <button
              onClick={() => refetch()}
              className="mt-4 rounded-full bg-sky-500 px-5 py-2 text-sm font-medium text-white shadow-soft transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              重试
            </button>
          </div>
        ) : (
          <div className={`mt-5 space-y-8 lg:mt-7 ${riseClass}`}>
            {/* ── 沉浸式主区：左 3D / 右信息 ── */}
            <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
              {/* 左：可旋转 3D 预览 或 封面兜底 */}
              <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-50 via-paper-50 to-white shadow-soft ring-1 ring-black/5">
                <div className="relative aspect-[4/3] w-full lg:aspect-auto lg:h-[clamp(26rem,62vh,40rem)]">
                  {hasModel ? (
                    <>
                      <Canvas
                        camera={{ position: [0.35, 0.3, 0.45], fov: 50 }}
                        dpr={[1, 2]}
                        className="!touch-none"
                      >
                        <ambientLight intensity={1.4} />
                        <directionalLight position={[5, 5, 5]} intensity={2.2} />
                        <directionalLight position={[-4, 2, -3]} intensity={0.6} />
                        <Suspense fallback={null}>
                          <AssembledDrone parts={safeParts} autoRotate={!reducedMotion} />
                        </Suspense>
                        <OrbitControls
                          makeDefault
                          enablePan={false}
                          enableDamping
                          minDistance={0.2}
                          maxDistance={1.5}
                        />
                      </Canvas>
                      {/* 拖动旋转提示 */}
                      <div className="pointer-events-none absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-black/55 shadow-sm ring-1 ring-black/5 backdrop-blur">
                        <Move3d size={13} className="text-sky-500" />
                        拖动可旋转查看
                      </div>
                    </>
                  ) : post.project?.coverUrl ? (
                    <img
                      src={post.project.coverUrl}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageOff size={44} className="text-sky-200" />
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/10 to-transparent" />
                </div>
                {/* 小标题 caption */}
                <div className="flex items-center justify-between gap-3 border-t border-black/5 bg-white/60 px-4 py-2.5 backdrop-blur">
                  <p className="truncate text-xs text-black/50">
                    {hasModel
                      ? `${post.title} · 木质榫卯飞行器 3D 预览`
                      : `${post.title} · 作品预览图`}
                  </p>
                  {hasModel && (
                    <span className="shrink-0 text-[11px] font-medium text-sky-400">实时渲染</span>
                  )}
                </div>
              </section>

              {/* 右：标题 + 作者 + 操作 + 介绍 + 来源 */}
              <div className="flex flex-col gap-5">
                {/* fork 血缘（只读 chip） */}
                {post.forkFrom && (
                  <Link
                    to={`/community/${post.forkFrom.postId}`}
                    className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600 ring-1 ring-sky-100 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <GitFork size={12} className="shrink-0" />
                    <span className="truncate">
                      基于 @{post.forkFrom.authorName || '某位创作者'} 的《{post.forkFrom.title}》再创作
                    </span>
                  </Link>
                )}

                <div className="min-w-0">
                  <h1 className="text-2xl font-bold leading-tight tracking-tight text-black/90 sm:text-3xl">
                    {post.title}
                  </h1>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-black/50">
                    <Heart size={13} className="text-rose-400" fill="currentColor" />
                    {post.likeCount} 人喜欢
                    {post.favoriteCount > 0 && (
                      <span className="text-black/40">· {post.favoriteCount} 人收藏</span>
                    )}
                  </p>
                </div>

                {/* 作者卡 */}
                <section className="rounded-2xl bg-white p-4 shadow-soft ring-1 ring-black/5">
                  <div className="flex items-center gap-3">
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
                            className="block truncate font-semibold text-black/90 transition-colors hover:text-sky-600"
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
                        <span className="font-semibold text-black/90">匿名创作者</span>
                      )}
                    </div>
                  </div>
                </section>

                {/* 操作条：点赞 / 收藏 / 复用 / 分享 */}
                <div className="flex flex-wrap items-center gap-2">
                  <LikeButton liked={post.likedByMe} count={post.likeCount} onToggle={onLike} />
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
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-sky-200 bg-white px-4 text-sm font-semibold text-black/70 shadow-sm transition-all duration-300 active:scale-95 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  >
                    <Share2 size={15} />
                    分享
                  </button>
                </div>

                {/* 作品介绍 */}
                <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-black/5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-black/90">
                    <Sparkles size={16} className="text-sky-500" />
                    作品介绍
                  </h2>
                  <p className="mt-2.5 whitespace-pre-wrap text-sm leading-relaxed text-black/65">
                    {post.description || '这位创作者还没有写作品介绍，但作品本身已经在说话啦。'}
                  </p>
                </section>
              </div>
            </div>

            {/* ── 零件清单 / 兜底说明（整宽，承接 PartsList 自身的版式） ── */}
            {hasModel ? (
              <section className="overflow-hidden rounded-2xl shadow-soft ring-1 ring-black/5">
                <PartsList parts={safeParts} />
              </section>
            ) : (
              <section className="rounded-2xl bg-white p-6 text-center shadow-soft ring-1 ring-black/5 sm:p-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                  <Boxes size={24} className="text-sky-300" />
                </div>
                <p className="font-semibold text-black/70">这是示例作品</p>
                <p className="mt-1 text-sm text-black/50">暂无可旋转的 3D 模型 / 零件清单</p>
              </section>
            )}

            {/* ── 评论区 ── */}
            <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-black/5 sm:p-6">
              <CommentSection postId={post.id} />
            </section>
          </div>
        )}
      </PageContainer>
    </CommunityShell>
  )
}

/** 详情骨架屏：与正式布局同构，避免加载→渲染的跳动。 */
function PostSkeleton() {
  return (
    <div className="mt-5 space-y-8 lg:mt-7">
      <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-sky-50 lg:aspect-auto lg:h-[clamp(26rem,62vh,40rem)]" />
        <div className="flex flex-col gap-5">
          <div className="h-8 w-2/3 animate-pulse rounded-lg bg-sky-50" />
          <div className="h-20 animate-pulse rounded-2xl bg-sky-50" />
          <div className="flex gap-2">
            <div className="h-11 w-20 animate-pulse rounded-full bg-sky-50" />
            <div className="h-11 w-20 animate-pulse rounded-full bg-sky-50" />
            <div className="h-11 w-28 animate-pulse rounded-full bg-sky-50" />
          </div>
          <div className="h-28 animate-pulse rounded-2xl bg-sky-50" />
        </div>
      </div>
      <div className="h-44 animate-pulse rounded-2xl bg-sky-50" />
    </div>
  )
}
