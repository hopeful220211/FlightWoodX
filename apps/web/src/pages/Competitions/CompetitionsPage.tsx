import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Inbox, AlertCircle, ArrowRight } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { useCompetitions } from '../../hooks/useCompetitions'
import { isFlagship } from './content/competitionContent'
import { CompetitionHero } from './components/CompetitionHero'
import { FlagshipCard, RegionalCard } from './components/CompetitionCards'

const PAGE_SIZE = 20
const EASE = [0.2, 0.8, 0.2, 1] as const

/** 排行榜入口卡：指向旗舰赛事排行榜，取不到旗舰则回退赛事列表。 */
function LeaderboardEntryCard({ flagshipId }: { flagshipId?: string }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const target = flagshipId ? `/competitions/${flagshipId}/leaderboard` : '/competitions'

  return (
    <motion.button
      type="button"
      onClick={() => nav(target)}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, ease: EASE }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="group flex w-full items-center justify-between gap-4 overflow-hidden rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-500 to-sky-600 p-6 text-left shadow-sky-glow transition-shadow hover:shadow-lift sm:p-8"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
          <BarChart3 size={24} />
        </span>
        <div>
          <h3 className="font-display text-xl font-bold text-white sm:text-2xl">实时排行榜</h3>
          <p className="mt-1 text-sm text-white/85">看看高手们的作品成绩，向榜首发起挑战。</p>
        </div>
      </div>
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-semibold text-sky-600 shadow-sm transition-transform group-hover:translate-x-0.5">
        查看排行
        <ArrowRight size={16} />
      </span>
    </motion.button>
  )
}

export function CompetitionsPage() {
  const { data, isLoading, isError, error } = useCompetitions(1, PAGE_SIZE)

  const items = data?.items ?? []
  // 主推赛事：优先年度旗舰，无则取进行中，再不行取第一个。兜底保证大卡 / 排行榜入口不空转。
  const featured =
    items.find((c) => isFlagship(c)) ??
    items.find((c) => c.status === 'open' || c.status === 'running') ??
    items[0]
  const others = items.filter((c) => c.id !== featured?.id)

  return (
    <PageContainer className="space-y-10 py-6 sm:space-y-12 sm:py-8">
      <CompetitionHero />

      {/* loading */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-2xl bg-sky-50" />
          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-sky-50" />
            ))}
          </div>
        </div>
      )}

      {/* error */}
      {isError && (
        <div className="rounded-2xl border border-sky-100/60 bg-white py-12 text-center shadow-soft">
          <AlertCircle size={32} className="mx-auto mb-3 text-error" />
          <p className="text-sm text-ink-600">
            加载赛事失败：{(error as Error)?.message || '请稍后重试'}
          </p>
        </div>
      )}

      {/* empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-2xl border border-sky-100/60 bg-white py-16 text-center shadow-soft">
          <Inbox size={36} className="mx-auto mb-3 text-sky-200" />
          <p className="text-sm text-ink-500">暂时还没有开放的赛事，敬请期待</p>
        </div>
      )}

      {/* content */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-10 sm:space-y-12">
          {featured && (
            <section className="space-y-5">
              <header>
                <h2 className="font-display text-2xl font-bold tracking-tight text-sky-900 lg:text-3xl">
                  本届主赛事
                </h2>
                <p className="mt-1 text-base text-sky-700">一年一度的木质无人机创意盛典</p>
              </header>
              <FlagshipCard comp={featured} />
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-5">
              <header>
                <h2 className="font-display text-2xl font-bold tracking-tight text-sky-900 lg:text-3xl">
                  更多赛事
                </h2>
                <p className="mt-1 text-base text-sky-700">区域实飞、专项挑战，总有一场适合你</p>
              </header>
              <div className="grid gap-6 sm:grid-cols-2">
                {others.map((comp) => (
                  <RegionalCard key={comp.id} comp={comp} />
                ))}
              </div>
            </section>
          )}

          <LeaderboardEntryCard flagshipId={featured?.id} />
        </div>
      )}
    </PageContainer>
  )
}
