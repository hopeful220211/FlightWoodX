import { useState } from 'react'
import { UserPlus, UserCheck, UserMinus } from 'lucide-react'
import { cn } from '../../../utils/cn'
import { useToast } from '../../common/Toast'
import { useAuthStore } from '../../../stores/authStore'
import { useToggleFollow } from '../../../hooks/useFollow'

export interface FollowButtonProps {
  /** 被关注的创作者 id。 */
  userId: string
  /** 初始关注态（来自 AuthorDTO.isFollowedByMe）。 */
  initialFollowed?: boolean
  /** 尺寸：md（默认，作者页头部）/ sm（卡片等紧凑场景）。 */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * 关注 / 已关注切换按钮（高端胶囊）。
 * - 未关注：实心天蓝 pill「关注」。
 * - 已关注：描边白底「已关注」，hover 转玫红「取消关注」暗示可解除。
 * - 未登录（含游客）点击 → toast 提示「登录后才能关注」，不发请求。
 * - 不渲染针对自己的关注按钮（调用方可能照传当前用户 id）。
 * - 乐观切换由 useToggleFollow 负责；本地 followed 镜像服务端写入结果，失败时由 hook 回滚作者缓存。
 */
export function FollowButton({ userId, initialFollowed = false, size = 'md', className }: FollowButtonProps) {
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

  const sizeCls = size === 'sm' ? 'min-h-[36px] px-4 text-[13px]' : 'min-h-[44px] px-6 text-sm'
  const iconSize = size === 'sm' ? 14 : 16

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={toggle.isPending}
      aria-pressed={followed}
      aria-label={followed ? '取消关注' : '关注'}
      className={cn(
        'group/follow relative inline-flex shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full font-semibold',
        'transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97] motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        sizeCls,
        followed
          ? 'bg-white text-sky-700 ring-1 ring-sky-200 hover:bg-rose-50 hover:text-rose-600 hover:ring-rose-200'
          : 'bg-sky-500 text-white shadow-sky-glow hover:bg-sky-600 hover:shadow-lift',
        className,
      )}
    >
      {followed ? (
        <>
          {/* 已关注：默认显示「已关注」，hover 切换为「取消关注」。 */}
          <span className="inline-flex items-center gap-1.5 transition-opacity duration-300 group-hover/follow:opacity-0 motion-reduce:transition-none">
            <UserCheck size={iconSize} />
            已关注
          </span>
          <span className="absolute inset-0 inline-flex items-center justify-center gap-1.5 opacity-0 transition-opacity duration-300 group-hover/follow:opacity-100 motion-reduce:transition-none">
            <UserMinus size={iconSize} />
            取消关注
          </span>
        </>
      ) : (
        <>
          <UserPlus size={iconSize} />
          关注
        </>
      )}
    </button>
  )
}
