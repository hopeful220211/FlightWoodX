import { useEffect, useRef, useState } from 'react'
import {
  Plane,
  PencilLine,
  PlaneTakeoff,
  Send,
  Copy,
  Trash2,
  MoreHorizontal,
  Eye,
  Heart,
  Component,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { DashboardWork, WorkCategory } from '../dashboardData'

/** 作品卡操作回调（父层后续接真实逻辑，本轮仅触发）。 */
export interface WorkCardProps {
  work: DashboardWork
  onContinueEdit?: (w: DashboardWork) => void
  /** 仿真试飞回调：仿真（RFC-015）未上线，本轮按钮置灰占位，故暂不触发，签名先行预留。 */
  onSimulate?: (w: DashboardWork) => void
  onPublish?: (w: DashboardWork) => void
  onDuplicate?: (w: DashboardWork) => void
  onDelete?: (w: DashboardWork) => void
}

/** 分类 → 中文标签 + 图标（与 WORK_CATEGORY_LABELS 同源文案）。 */
const CATEGORY_META: Record<WorkCategory, { label: string; icon: LucideIcon }> = {
  drone: { label: '无人机', icon: Plane },
  aircraft: { label: '飞行器', icon: PlaneTakeoff },
  part: { label: '零部件', icon: Component },
}

/** updatedAt → 友好时间（刚刚 / N 分钟前 / N 小时前 / 昨天 / N 天前 / 年月日）。 */
function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 小时前`
  const day = Math.floor(hour / 24)
  if (day === 1) return '昨天'
  if (day < 7) return `${day} 天前`
  const d = new Date(then)
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

/** 紧凑数字（1.2k）。 */
function formatCount(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
}

export function WorkCard({
  work,
  onContinueEdit,
  // onSimulate 暂未消费：仿真试飞按钮置灰占位（RFC-015 未上线），签名仍由 WorkCardProps 保留。
  onPublish,
  onDuplicate,
  onDelete,
}: WorkCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 点击外部 / Esc 关闭「更多操作」菜单。
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const meta = CATEGORY_META[work.category]
  const CategoryIcon = meta.icon
  const showPlaceholder = !work.coverImage || coverFailed

  const menuItems: { key: string; label: string; icon: LucideIcon; onClick?: () => void; danger?: boolean }[] = [
    { key: 'edit', label: '继续编辑', icon: PencilLine, onClick: () => onContinueEdit?.(work) },
    { key: 'publish', label: '发布到社区', icon: Send, onClick: () => onPublish?.(work) },
    { key: 'duplicate', label: '复制设计', icon: Copy, onClick: () => onDuplicate?.(work) },
    { key: 'delete', label: '删除', icon: Trash2, onClick: () => onDelete?.(work), danger: true },
  ]

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-card border border-sky-100/70 bg-white text-left',
        'shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-sky-glow',
        'focus-within:border-sky-300',
      )}
    >
      {/* 封面 */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sky-50">
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-sky-50 to-white">
            <Plane className="h-12 w-12 text-sky-300" strokeWidth={1.5} aria-hidden />
          </div>
        ) : (
          <img
            src={work.coverImage}
            alt={`${work.title} 封面`}
            loading="lazy"
            onError={() => setCoverFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}

        {/* 悬浮快捷操作：键盘可聚焦时也显示；reduced-motion 友好（仅 opacity） */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 p-3',
            'bg-gradient-to-t from-sky-950/60 to-transparent opacity-0 transition-opacity duration-200',
            'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
            'motion-reduce:transition-none',
          )}
        >
          <button
            type="button"
            onClick={() => onContinueEdit?.(work)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-accent-spark px-3.5 py-2 text-xs font-semibold text-white shadow-sky-glow transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <PencilLine className="h-3.5 w-3.5" aria-hidden />
            继续编辑
          </button>

          {/* 仿真试飞：RFC-015 未上线 → 置灰不可点 + 即将开放 tag */}
          <span
            aria-disabled
            title="仿真试飞即将开放"
            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-pill bg-white/85 px-3.5 py-2 text-xs font-semibold text-sky-700/70"
          >
            <PlaneTakeoff className="h-3.5 w-3.5" aria-hidden />
            仿真试飞
            <span className="rounded-tag bg-accent-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-gold">
              即将开放
            </span>
          </span>
        </div>
      </div>

      {/* 正文 */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-base font-bold text-sky-900" title={work.title}>
            {work.title}
          </h3>

          {/* 更多操作菜单（键盘可达） */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="更多操作"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-sky-700/70 transition hover:bg-sky-50 hover:text-sky-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-spark"
            >
              <MoreHorizontal className="h-4.5 w-4.5" aria-hidden />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-xl border border-sky-100 bg-white py-1 shadow-lift"
              >
                {menuItems.map((mi) => {
                  const Icon = mi.icon
                  return (
                    <button
                      key={mi.key}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        mi.onClick?.()
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-sm transition',
                        mi.danger
                          ? 'text-error hover:bg-error/10'
                          : 'text-sky-900 hover:bg-sky-50',
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      {mi.label}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* 分类标签 */}
        <span className="inline-flex w-fit items-center gap-1 rounded-tag bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700">
          <CategoryIcon className="h-3.5 w-3.5" aria-hidden />
          {meta.label}
        </span>

        {/* 元信息：修改时间 + 浏览 + 点赞 */}
        <div className="mt-auto flex items-center justify-between pt-1 text-xs text-sky-700/70">
          <span>{formatRelativeTime(work.updatedAt)}</span>
          <span className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1" title={`${work.views} 次浏览`}>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              {formatCount(work.views)}
            </span>
            <span className="inline-flex items-center gap-1" title={`${work.likes} 个点赞`}>
              <Heart className="h-3.5 w-3.5" aria-hidden />
              {formatCount(work.likes)}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
