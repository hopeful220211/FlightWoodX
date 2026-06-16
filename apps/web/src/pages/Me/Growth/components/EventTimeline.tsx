import { GraduationCap, GitFork, Trophy, type LucideIcon } from 'lucide-react'
import { pointsForEvent, type GrowthEvent, type GrowthEventType } from '@fwx/shared'

const EVENT_ICON: Record<GrowthEventType, LucideIcon> = {
  lesson_completed: GraduationCap,
  project_was_forked: GitFork,
  competition_ranked: Trophy,
}

function describe(e: GrowthEvent): string {
  switch (e.type) {
    case 'lesson_completed':
      return '完成了一节课程'
    case 'project_was_forked':
      return '你的作品被同伴 fork'
    case 'competition_ranked':
      // 防御：非法 rank（聚合允许但计 0 分）不展示「第 0 / NaN 名」
      return Number.isInteger(e.rank) && e.rank > 0 ? `在赛事中获得第 ${e.rank} 名` : '参加了一场赛事'
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export interface EventTimelineProps {
  events: GrowthEvent[]
}

/** 成长足迹：最近事件时间线（已倒序），每条带文案、日期与积分。 */
export function EventTimeline({ events }: EventTimelineProps) {
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const Icon = EVENT_ICON[e.type]
        const pts = pointsForEvent(e)
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-xl border border-sky-100/70 bg-white p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Icon size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink-900">{describe(e)}</p>
              <p className="text-xs text-ink-400">{formatDate(e.occurredAt)}</p>
            </div>
            {pts > 0 && <span className="shrink-0 text-sm font-bold text-success">+{pts}</span>}
          </li>
        )
      })}
    </ol>
  )
}
