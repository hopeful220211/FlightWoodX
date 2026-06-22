import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Crown, Medal, Trophy, AlertCircle } from 'lucide-react'
import type { Competition } from '@fwx/shared'
import { useLeaderboard } from '../../../hooks/useCompetitions'
import { SECTION_IDS } from '../content/competitionContent'
import { BigStat } from '../../../components/common/BigStat'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { PillButton } from '../../../components/common/PillButton'

/**
 * 详情页内嵌的排行榜预览（RFC-018 / RFC-020 视觉整改）。
 * 自己调用 useLeaderboard 拉数据，渲染前 3-5 名：前三名做领奖台高亮（金银铜），
 * 总分用 BigStat 大字呈现，其余以紧凑行展示，底部 PillButton 跳完整排行榜。
 * 标题随赛事状态变化，语义诚实。
 */

/**
 * 前三名质感高亮（金/银/铜），index 0/1/2 对应名次 1/2/3。
 * 金银铜以「描边 ring + 小面积奖牌图标 + 渐变底」表达，避免大块色块。
 */
const PODIUM = [
  {
    icon: Crown,
    medal: '冠军',
    ring: 'ring-2 ring-accent-gold/70',
    iconWrap: 'bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 text-accent-gold',
    badge: 'border border-accent-gold/50 text-accent-gold',
    /** 冠军居中拔高。 */
    order: 'sm:order-2',
    lift: 'sm:-mt-4',
  },
  {
    icon: Trophy,
    medal: '亚军',
    ring: 'ring-1 ring-ink-200',
    iconWrap: 'bg-gradient-to-br from-ink-100 to-surface-ice text-ink-500',
    badge: 'border border-ink-200 text-ink-500',
    order: 'sm:order-1',
    lift: 'sm:mt-4',
  },
  {
    icon: Medal,
    medal: '季军',
    ring: 'ring-1 ring-wood-300',
    iconWrap: 'bg-gradient-to-br from-wood-100 to-surface-white text-wood-500',
    badge: 'border border-wood-300 text-wood-500',
    order: 'sm:order-3',
    lift: 'sm:mt-4',
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
  const navigate = useNavigate()
  const { data, isLoading, isError } = useLeaderboard(competitionId)

  const kicker = status === 'closed' ? 'Final Results' : 'Leaderboard'
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
      <div className="mb-8 max-w-2xl">
        <SectionLabel className="text-accent-spark">{kicker}</SectionLabel>
        <h2 className="mt-3 font-grotesk text-h3 font-semibold tracking-tight text-ink-900">
          {heading}
        </h2>
        <p className="mt-2 text-body text-ink-500">{subtitle}</p>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-card bg-surface-ice" />
          ))}
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-2 rounded-card border border-sky-100/60 bg-surface-white px-6 py-7 text-body text-ink-600 shadow-soft">
          <AlertCircle size={18} className="text-error" />
          排行榜暂时加载失败，请稍后刷新重试。
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-card border border-dashed border-sky-200 bg-surface-ice/60 px-6 py-14 text-center">
          <Trophy size={32} className="mx-auto mb-3 text-sky-300" />
          {status === 'closed' ? (
            <p className="text-title-sm font-semibold text-ink-700">本届暂无最终成绩</p>
          ) : (
            <>
              <p className="text-title-sm font-semibold text-ink-700">还没有成绩，快来抢首杀</p>
              <p className="mt-1 text-body text-ink-500">提交你的作品，成为榜单上的第一个名字。</p>
            </>
          )}
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-5">
          {/* 领奖台：前三名 */}
          <div className="grid gap-4 sm:grid-cols-3 sm:items-end">
            {podium.map((row, i) => {
              // 布局位置按列（冠军居中拔高），奖牌身份按真实名次（并列同分同奖牌）。
              const layout = PODIUM[i]
              const p = { ...PODIUM[Math.min(row.rank - 1, 2)], order: layout.order, lift: layout.lift }
              const Icon = p.icon
              return (
                <motion.div
                  key={row.submissionId}
                  initial={reduce ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, ease, delay: reduce ? 0 : i * 0.08 }}
                  className={`${p.order} ${p.lift} relative flex flex-col items-center rounded-card border border-sky-100/60 bg-surface-white p-6 text-center shadow-soft ${p.ring}`}
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full ${p.iconWrap}`}
                  >
                    <Icon size={26} />
                  </div>
                  <span
                    className={`mt-3 inline-flex items-center rounded-tag px-3 py-1 text-label uppercase ${p.badge}`}
                  >
                    {p.medal}
                  </span>
                  <div
                    className="mt-3 max-w-full truncate font-grotesk text-title-sm font-semibold text-ink-900"
                    title={row.userName}
                  >
                    {row.userName}
                  </div>
                  <div className="max-w-full truncate text-body text-ink-400" title={row.projectName}>
                    {row.projectName}
                  </div>
                  <BigStat
                    value={row.total}
                    label="总分"
                    className="mt-4 items-center text-center"
                  />
                </motion.div>
              )
            })}
          </div>

          {/* 第 4-5 名紧凑行 */}
          {rest.length > 0 && (
            <ul className="divide-y divide-sky-50 overflow-hidden rounded-card border border-sky-100/60 bg-surface-white shadow-soft">
              {rest.map((row) => (
                <li key={row.submissionId} className="flex items-center gap-4 px-6 py-4">
                  <span className="w-7 text-center font-grotesk text-title-sm font-semibold tabular-nums text-ink-400">
                    {row.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-body font-medium text-ink-800">{row.userName}</div>
                    <div className="truncate text-body text-ink-400">{row.projectName}</div>
                  </div>
                  <span className="font-grotesk text-title-sm font-semibold tabular-nums text-ink-900">
                    {row.total}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="pt-2">
            <PillButton
              variant="ghost"
              arrow
              onClick={() => navigate(`/competitions/${competitionId}/leaderboard`)}
            >
              查看完整排行榜
            </PillButton>
          </div>
        </div>
      )}
    </section>
  )
}
