import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Crown, Medal, Trophy, ChevronRight, AlertCircle } from 'lucide-react'
import type { Competition } from '@fwx/shared'
import { useLeaderboard } from '../../../hooks/useCompetitions'
import { SECTION_IDS } from '../content/competitionContent'

/**
 * 详情页内嵌的排行榜预览（RFC-018）。
 * 自己调用 useLeaderboard 拉数据，渲染前 3-5 名：前三名做领奖台高亮（金银铜），
 * 其余以紧凑行展示，底部链接到完整排行榜。标题随赛事状态变化，语义诚实。
 */

/** 前三名样式（金 / 银 / 铜），index 0/1/2 对应名次 1/2/3。 */
const PODIUM = [
  {
    icon: Crown,
    medal: '冠军',
    ring: 'ring-accent-gold/60',
    bg: 'bg-accent-gold/10',
    text: 'text-accent-gold',
    badge: 'bg-accent-gold text-white',
    /** 领奖台相对高度，冠军最高居中。 */
    order: 'order-2',
    height: 'sm:mt-0',
  },
  {
    icon: Trophy,
    medal: '亚军',
    ring: 'ring-ink-200',
    bg: 'bg-ink-100/60',
    text: 'text-ink-500',
    badge: 'bg-ink-300 text-white',
    order: 'order-1',
    height: 'sm:mt-6',
  },
  {
    icon: Medal,
    medal: '季军',
    ring: 'ring-wood-300',
    bg: 'bg-wood-100/50',
    text: 'text-wood-500',
    badge: 'bg-wood-400 text-white',
    order: 'order-3',
    height: 'sm:mt-6',
  },
] as const

export function LeaderboardPreview({
  competitionId,
  status,
}: {
  competitionId: string
  status: Competition['status']
}): JSX.Element {
  const reduce = useReducedMotion()
  const { data, isLoading, isError } = useLeaderboard(competitionId)

  const heading = status === 'closed' ? '获奖公示 · 最终成绩' : '实时榜单'
  const subtitle =
    status === 'closed'
      ? '本届赛事已结束，以下为评审录入的最终名次。'
      : '随评审录入实时更新，名次仅供参考。'

  const items = data?.items ?? []
  const podium = items.slice(0, 3)
  const rest = items.slice(3, 5)

  const ease = [0.2, 0.8, 0.2, 1] as const

  return (
    <section id={SECTION_IDS.leaderboard} className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900">{heading}</h2>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
        </div>
        <Link
          to={`/competitions/${competitionId}/leaderboard`}
          className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 transition hover:text-sky-700"
        >
          查看完整排行榜
          <ChevronRight size={16} />
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-sky-50" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-100/60 bg-white/90 px-5 py-6 text-sm text-ink-600 shadow-soft">
          <AlertCircle size={18} className="text-error" />
          排行榜暂时加载失败，请稍后刷新重试。
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 px-6 py-12 text-center">
          <Trophy size={32} className="mx-auto mb-3 text-sky-300" />
          {status === 'closed' ? (
            <p className="text-base font-semibold text-ink-700">本届暂无最终成绩</p>
          ) : (
            <>
              <p className="text-base font-semibold text-ink-700">还没有成绩，快来抢首杀</p>
              <p className="mt-1 text-sm text-ink-500">提交你的作品，成为榜单上的第一个名字。</p>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-4">
          {/* 领奖台：前三名 */}
          <div className="grid gap-3 sm:grid-cols-3 sm:items-end">
            {podium.map((row, i) => {
              // 布局位置按列（冠军居中拔高），奖牌身份按真实名次（并列同分同奖牌）。
              const layout = PODIUM[i]
              const p = { ...PODIUM[Math.min(row.rank - 1, 2)], order: layout.order, height: layout.height }
              const Icon = p.icon
              return (
                <motion.div
                  key={row.submissionId}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease, delay: reduce ? 0 : i * 0.08 }}
                  className={`${p.order} ${p.height} relative rounded-2xl border border-sky-100/60 bg-white/90 p-5 text-center shadow-soft ring-1 ${p.ring}`}
                >
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${p.bg}`}
                  >
                    <Icon size={22} className={p.text} />
                  </div>
                  <span
                    className={`mt-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.badge}`}
                  >
                    {p.medal}
                  </span>
                  <div className="mt-2 truncate text-sm font-semibold text-ink-900" title={row.userName}>
                    {row.userName}
                  </div>
                  <div className="truncate text-xs text-ink-400" title={row.projectName}>
                    {row.projectName}
                  </div>
                  <div className="mt-2 font-display text-2xl font-bold text-sky-600">{row.total}</div>
                </motion.div>
              )
            })}
          </div>

          {/* 第 4-5 名紧凑行 */}
          {rest.length > 0 && (
            <ul className="divide-y divide-sky-50 overflow-hidden rounded-2xl border border-sky-100/60 bg-white/90 shadow-soft">
              {rest.map((row) => (
                <li key={row.submissionId} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 text-center text-sm font-semibold text-ink-400">{row.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-800">{row.userName}</div>
                    <div className="truncate text-xs text-ink-400">{row.projectName}</div>
                  </div>
                  <span className="text-sm font-semibold text-sky-600">{row.total}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
