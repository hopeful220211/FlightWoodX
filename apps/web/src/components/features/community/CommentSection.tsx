import { useEffect, useRef, useState } from 'react'
import { MessageCircle, MoreHorizontal, Trash2, Flag, UserCircle2 } from 'lucide-react'
import { Button } from '../../common/Button'
import { useToast } from '../../common/Toast'
import { cn } from '../../../utils/cn'
import { useAuthStore } from '../../../stores/authStore'
import {
  useComments,
  useAddComment,
  useDeleteComment,
  useReportComment,
  type CommentDTO,
  type ReportReason,
} from '../../../hooks/useComments'

const MAX_LEN = 300
const REASONS: ReportReason[] = ['垃圾广告', '不友善', '涉及隐私', '其他']

/** 友好的相对时间（刚刚 / N 分钟前 / N 小时前 / N 天前 / 具体日期）。 */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diff = Date.now() - then
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return new Date(then).toLocaleDateString('zh-CN')
}

function Avatar({ comment }: { comment: CommentDTO }) {
  const url = comment.author?.avatar
  if (url) {
    return (
      <img
        src={url}
        alt={comment.author?.username || '用户'}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-sky-100"
        loading="lazy"
      />
    )
  }
  return <UserCircle2 size={36} className="shrink-0 text-sky-200" aria-hidden />
}

/** 单条评论：头像 + 用户名 + 时间 + 正文 + 操作（举报 / 作者删除）。 */
function CommentRow({ comment, postId }: { comment: CommentDTO; postId: string }) {
  const toast = useToast()
  const myId = useAuthStore((s) => s.user?.id)
  const isMine = !!myId && myId === comment.authorId

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const del = useDeleteComment(postId)
  const report = useReportComment()

  // 点外部 / Esc 关闭操作菜单
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const onDelete = () => {
    setMenuOpen(false)
    if (!window.confirm('确定删除这条评论吗？')) return
    del.mutate(comment.id, {
      onSuccess: () => toast.push('success', '已删除'),
      onError: (e) => toast.push('error', e instanceof Error ? e.message : '删除失败'),
    })
  }

  const onReport = (reason: ReportReason) => {
    setMenuOpen(false)
    report.mutate(
      { commentId: comment.id, reason },
      {
        onSuccess: () => toast.push('success', '已举报，我们会尽快处理'),
        onError: (e) => toast.push('error', e instanceof Error ? e.message : '举报失败'),
      },
    )
  }

  return (
    <li className="flex gap-3 py-3">
      <Avatar comment={comment} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-800">
            {comment.author?.username || '匿名'}
          </span>
          <span className="shrink-0 text-xs text-ink-400">{relativeTime(comment.createdAt)}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-700">{comment.body}</p>
      </div>

      {/* 操作菜单：举报（所有人）/ 删除（仅作者本人） */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-md p-1.5 text-ink-400 transition-colors hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/40"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label="更多操作"
        >
          <MoreHorizontal size={16} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-sky-100 bg-white py-1 shadow-lift"
          >
            {isMine ? (
              <button
                type="button"
                role="menuitem"
                onClick={onDelete}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-500 transition-colors hover:bg-rose-50 focus-visible:bg-rose-50 focus-visible:outline-none"
              >
                <Trash2 size={14} /> 删除
              </button>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-3 pb-1 pt-0.5 text-xs font-medium text-ink-400">
                  <Flag size={12} /> 举报理由
                </div>
                {REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    role="menuitem"
                    onClick={() => onReport(reason)}
                    className="block w-full px-3 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none"
                  >
                    {reason}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

/** 社区作品评论区：标题计数 + 发表框（登录后可用）+ 评论列表（三态）。 */
export function CommentSection({ postId }: { postId: string }) {
  const toast = useToast()
  const isLoggedIn = useAuthStore((s) => !!s.token && !s.user?.isGuest)

  const { data, isLoading, isError, refetch } = useComments(postId)
  const add = useAddComment(postId)

  const [draft, setDraft] = useState('')
  const trimmed = draft.trim()

  const submit = () => {
    if (!trimmed || add.isPending) return
    add.mutate(trimmed, {
      onSuccess: () => {
        setDraft('')
        toast.push('success', '评论已发布')
      },
      onError: (e) => toast.push('error', e instanceof Error ? e.message : '评论失败'),
    })
  }

  const count = data?.total ?? 0

  return (
    <section className="space-y-4" aria-label="评论区">
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <MessageCircle size={18} className="text-sky-500" />
        评论 {count > 0 && <span className="text-ink-400">({count})</span>}
      </h2>

      {/* 发表框：登录后可用，游客提示登录 */}
      {isLoggedIn ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
            placeholder="友善地说两句吧～"
            rows={3}
            maxLength={MAX_LEN}
            className={cn(
              'w-full resize-none rounded-lg border border-sky-200 bg-white px-4 py-2.5 text-sm text-ink-900 transition placeholder:text-ink-400',
              'focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20',
            )}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-400">{draft.length}/{MAX_LEN}</span>
            <Button size="sm" onClick={submit} loading={add.isPending} disabled={!trimmed}>
              发布
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-sky-200 bg-sky-50/50 px-4 py-3 text-center text-sm text-ink-500">
          登录后才能评论
        </div>
      )}

      {/* 列表三态 */}
      {isLoading ? (
        <ul className="divide-y divide-sky-50">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex gap-3 py-3">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-sky-100" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-24 animate-pulse rounded bg-sky-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-sky-100" />
              </div>
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-ink-400">评论加载失败</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            重试
          </Button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-400">还没有评论，来说两句吧</p>
      ) : (
        <ul className="divide-y divide-sky-50">
          {data.items.map((c) => (
            <CommentRow key={c.id} comment={c} postId={postId} />
          ))}
        </ul>
      )}
    </section>
  )
}
