import { Check, Sparkles, type LucideIcon } from 'lucide-react'
import { GROWTH_TASKS, type GrowthMetrics, type GrowthTask } from '@fwx/shared'
import { cn } from '../../../../utils/cn'
import { SectionLabel } from '../../../../components/common/SectionLabel'
import { ProgressBar } from '../../../../components/common/ProgressBar'

export interface TaskCenterProps {
  metrics: GrowthMetrics
}

/** 成就型任务进度：已达成的当前次数（封顶到 target）。 */
function achievementProgress(task: GrowthTask, metrics: GrowthMetrics): { current: number; done: boolean } {
  const raw = task.metricKey ? metrics[task.metricKey] : 0
  const current = Math.min(raw, task.target)
  return { current, done: raw >= task.target }
}

/** 单条任务卡：成就型展示进度条，每日型展示行动入口。 */
function TaskRow({ task, metrics }: { task: GrowthTask; metrics: GrowthMetrics }) {
  const isAchievement = task.period === 'achievement'
  const { current, done } = isAchievement ? achievementProgress(task, metrics) : { current: 0, done: false }
  const percent = isAchievement && task.target > 0 ? Math.round((current / task.target) * 100) : 0

  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center',
        done ? 'border-success/30 bg-success/5' : 'border-black/10 bg-white',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h4 className={cn('text-sm font-bold', done ? 'text-success' : 'text-ink-900')}>{task.name}</h4>
          {done && <Check size={15} className="text-success" aria-hidden="true" />}
        </div>
        <p className="mt-0.5 text-xs text-ink-400">{task.desc}</p>
        {isAchievement && (
          <div className="mt-2.5 flex items-center gap-2">
            <ProgressBar
              value={percent}
              showLabel={false}
              barClassName={done ? 'bg-success' : 'bg-sky-600'}
              className="flex-1"
            />
            <span className="shrink-0 font-grotesk text-xs font-semibold tabular-nums text-ink-500">
              {current}/{task.target}
            </span>
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
        <span className="font-grotesk text-sm font-bold text-accent-spark">+{task.rewardPoints}</span>
        {!isAchievement &&
          (done ? (
            <span className="inline-flex items-center gap-1 rounded-pill bg-success/10 px-3 py-1.5 text-xs font-semibold text-success">
              <Check size={13} aria-hidden="true" /> 已完成
            </span>
          ) : (
            <button
              type="button"
              className="touch-target rounded-pill bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              去完成
            </button>
          ))}
      </div>
    </li>
  )
}

function TaskGroup({
  title,
  icon: Icon,
  tasks,
  metrics,
}: {
  title: string
  icon: LucideIcon
  tasks: GrowthTask[]
  metrics: GrowthMetrics
}) {
  if (tasks.length === 0) return null
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-sky-600" aria-hidden="true" />
        <SectionLabel>{title}</SectionLabel>
      </div>
      <ul className="space-y-3">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} metrics={metrics} />
        ))}
      </ul>
    </div>
  )
}

/** 成长任务中心：把「怎么涨分」做成明确清单，分每日任务 / 成就任务两组。 */
export function TaskCenter({ metrics }: TaskCenterProps) {
  const dailyTasks = GROWTH_TASKS.filter((t) => t.period === 'daily')
  const achievementTasks = GROWTH_TASKS.filter((t) => t.period === 'achievement')
  return (
    <div className="space-y-6">
      <TaskGroup title="每日任务" icon={Sparkles} tasks={dailyTasks} metrics={metrics} />
      <TaskGroup title="成就任务" icon={Check} tasks={achievementTasks} metrics={metrics} />
    </div>
  )
}
