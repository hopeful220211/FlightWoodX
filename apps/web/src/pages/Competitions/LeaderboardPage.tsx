import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Crown, Medal, Trophy, AlertCircle, Inbox } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Card } from '../../components/common/Card'
import type { ScoreDimensions } from '@fwx/shared'
import { useLeaderboard, useCompetition } from '../../hooks/useCompetitions'

/**
 * 完整排行榜独立页（RFC-018）。真实 useLeaderboard，前三名领奖台高亮，
 * 每行展开四维分数（设计 / 编程 / 创意 / 任务完成），保留分页与三态。
 */

/** 前三名样式映射，index 0/1/2 对应名次 1/2/3。 */
const PODIUM = [
  { icon: Crown, label: '冠军', text: 'text-accent-gold', ring: 'ring-accent-gold/60', bg: 'bg-accent-gold/10' },
  { icon: Trophy, label: '亚军', text: 'text-ink-500', ring: 'ring-ink-200', bg: 'bg-ink-100/60' },
  { icon: Medal, label: '季军', text: 'text-wood-500', ring: 'ring-wood-300', bg: 'bg-wood-100/50' },
] as const

const DIMENSION_LABEL: { key: keyof ScoreDimensions; label: string }[] = [
  { key: 'design', label: '设计' },
  { key: 'programming', label: '编程' },
  { key: 'creativity', label: '创意' },
  { key: 'taskCompletion', label: '任务完成' },
]

function DimensionBar({ label, value, max }: { label: string; value: number; max: number }) {
  // 进度按该维度满分（来自赛事 scoringRules）折算，而非固定 100。
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-400">{label}</span>
        <span className="font-medium text-ink-600">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sky-50">
        <div className="h-full rounded-full bg-sky-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function LeaderboardPage() {
  const { id } = useParams()
  const reduce = useReducedMotion()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useLeaderboard(id, page)
  const { data: comp } = useCompetition(id)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const items = data?.items ?? []
  // 各维度满分（来自赛事评分规则），用于进度条折算；取不到时回退 25（现行规则）。
  const dimMax = (key: keyof ScoreDimensions): number => comp?.scoringRules?.[key] ?? 25

  const ease = [0.2, 0.8, 0.2, 1] as const

  return (
    <PageContainer className="space-y-6 py-8">
      <Breadcrumb
        items={[
          { label: '赛事中心', to: '/competitions' },
          { label: '赛事详情', to: `/competitions/${id}` },
          { label: '排行榜' },
        ]}
      />

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 lg:text-3xl">
          完整排行榜
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          按总分排序，每位选手附设计 / 编程 / 创意 / 任务完成四维得分。
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-sky-50" />
          ))}
        </div>
      )}

      {isError && (
        <Card hoverable={false} className="py-10 text-center">
          <AlertCircle size={28} className="mx-auto mb-2 text-error" />
          <p className="text-sm text-ink-600">{(error as Error)?.message || '加载排行榜失败'}</p>
        </Card>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <Card hoverable={false} className="py-12 text-center">
          <Inbox size={32} className="mx-auto mb-2 text-sky-200" />
          <p className="text-sm text-ink-500">
            还没有成绩，提交作品并经评审录入后将出现在这里
          </p>
        </Card>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <>
          <ul className="space-y-3">
            {items.map((row, idx) => {
              const podium = row.rank <= 3 ? PODIUM[row.rank - 1] : null
              const RankIcon = podium?.icon
              return (
                <motion.li
                  key={row.submissionId}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease, delay: reduce ? 0 : Math.min(idx, 6) * 0.04 }}
                >
                  <Card
                    hoverable={false}
                    className={podium ? `ring-1 ${podium.ring}` : undefined}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      {/* 名次 + 选手 */}
                      <div className="flex items-center gap-3 sm:w-64">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${
                            podium ? `${podium.bg} ${podium.text}` : 'bg-sky-50 text-ink-400'
                          }`}
                        >
                          {RankIcon ? <RankIcon size={20} /> : row.rank}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-ink-900" title={row.userName}>
                            {row.userName}
                          </div>
                          <div className="truncate text-xs text-ink-400" title={row.projectName}>
                            {row.projectName}
                          </div>
                        </div>
                      </div>

                      {/* 四维分数 */}
                      <div className="grid flex-1 grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
                        {DIMENSION_LABEL.map((d) => (
                          <DimensionBar
                            key={d.key}
                            label={d.label}
                            value={row.dimensions[d.key]}
                            max={dimMax(d.key)}
                          />
                        ))}
                      </div>

                      {/* 总分 */}
                      <div className="flex items-center justify-between sm:w-20 sm:flex-col sm:items-end sm:justify-center">
                        <span className="text-xs text-ink-400 sm:hidden">总分</span>
                        <span className="font-display text-2xl font-bold text-sky-600">{row.total}</span>
                      </div>
                    </div>
                  </Card>
                </motion.li>
              )
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-ink-600 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <span className="text-sm text-ink-500">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-ink-600 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
