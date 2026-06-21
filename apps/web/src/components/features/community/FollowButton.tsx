import { useState } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { useToast } from '../../common/Toast'
import { useAuthStore } from '../../../stores/authStore'
import { useToggleFollow } from '../../../hooks/useFollow'

export interface FollowButtonProps {
  /** 被关注的创作者 id。 */
  userId: string
  /** 初始关注态（来自 AuthorDTO.isFollowedByMe）。 */
  initialFollowed?: boolean
  className?: string
}

/**
 * 关注 / 已关注切换按钮。
 * - 未登录（含游客）点击 → toast 提示「登录后才能关注」，不发请求。
 * - 不渲染针对自己的关注按钮（调用方可能照传当前用户 id）。
 * - 乐观切换由 useToggleFollow 负责；本地 followed 镜像服务端写入结果，失败时由 hook 回滚作者缓存。
 */
export function FollowButton({ userId, initialFollowed = false, className }: FollowButtonProps) {
  const toast = useToast()
  const currentUser = useAuthStore((s) => s.user)
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)
  const toggle = useToggleFollow()

  const [followed, setFollowed] = useState(initialFollowed)

  // 自己的主页不显示关注按钮。
  if (currentUser && currentUser.id === userId) return null

  const onClick = () => {
    if (!isLoggedIn) {
      toast.push('info', '登录后才能关注')
      return
    }
    const prev = followed
    setFollowed(!prev)
    toggle.mutate(
      { userId, followed: prev },
      { onError: () => setFollowed(prev) },
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={followed}
      aria-label={followed ? '取消关注' : '关注'}
      className={cn(
        'touch-target inline-flex min-h-[44px] items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold shadow-sm transition active:scale-95 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1',
        followed
          ? 'border border-sky-200 bg-white text-sky-700 hover:bg-sky-50'
          : 'bg-sky-500 text-white hover:bg-sky-600 shadow-sky-glow',
        className,
      )}
    >
      {followed ? <UserCheck size={16} /> : <UserPlus size={16} />}
      {followed ? '已关注' : '关注'}
    </button>
  )
}
