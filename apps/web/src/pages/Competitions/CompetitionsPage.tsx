import { useNavigate } from 'react-router-dom'
import { Inbox, AlertCircle } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { useCompetitions } from '../../hooks/useCompetitions'
import { isFlagship } from './content/competitionContent'
import { CompetitionHero } from './components/CompetitionHero'
import { FlagshipCard, RegionalCard } from './components/CompetitionCards'
import { SectionLabel } from '../../components/common/SectionLabel'
import { PillButton } from '../../components/common/PillButton'
import { BigStat } from '../../components/common/BigStat'

const PAGE_SIZE = 20

/** 排行榜入口（RFC-020）：浅色冰蓝区块 + 大数据 + PillButton，避免整块蓝渐变。 */
function LeaderboardEntryCard({ flagshipId, total }: { flagshipId?: string; total: number }) {
  const nav = useNavigate()
  const target = flagshipId ? `/competitions/${flagshipId}/leaderboard` : '/competitions'

  return (
    <section className="flex flex-col items-start justify-between gap-8 rounded-card bg-surface-ice px-8 py-12 sm:px-12 lg:flex-row lg:items-center">
      <div className="max-w-xl">
        <SectionLabel className="text-accent-spark">Leaderboard</SectionLabel>
        <h2 className="mt-4 font-grotesk text-h2 font-bold leading-tight text-ink-900">
          看看高手们的成绩
        </h2>
        <p className="mt-4 max-w-[560px] text-body text-ink-600">
          实时排行榜，向榜首发起挑战。每一份作品都来自真实参赛的同学。
        </p>
      </div>
      <div className="flex items-end gap-10">
        <BigStat value={total} unit="人" label="正在同台竞技" />
        <PillButton arrow onClick={() => nav(target)}>
          查看排行
        </PillButton>
      </div>
    </section>
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
  const totalRegistered = items.reduce((sum, c) => sum + (c.registeredCount ?? 0), 0)

  return (
    <PageContainer className="space-y-16 py-6 sm:space-y-24 sm:py-10">
      <CompetitionHero />

      {/* loading */}
      {isLoading && (
        <div className="space-y-6">
          <div className="h-80 animate-pulse rounded-card bg-surface-ice" />
          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-card bg-surface-ice" />
            ))}
          </div>
        </div>
      )}

      {/* error */}
      {isError && (
        <div className="rounded-card border border-sky-100/60 bg-surface-white py-12 text-center shadow-soft">
          <AlertCircle size={32} className="mx-auto mb-3 text-error" />
          <p className="text-sm text-ink-600">
            加载赛事失败：{(error as Error)?.message || '请稍后重试'}
          </p>
        </div>
      )}

      {/* empty */}
      {!isLoading && !isError && items.length === 0 && (
        <div className="rounded-card border border-sky-100/60 bg-surface-white py-16 text-center shadow-soft">
          <Inbox size={36} className="mx-auto mb-3 text-sky-200" />
          <p className="text-sm text-ink-500">暂时还没有开放的赛事，敬请期待</p>
        </div>
      )}

      {/* content */}
      {!isLoading && !isError && items.length > 0 && (
        <div className="space-y-16 sm:space-y-24">
          {featured && (
            <section className="space-y-7">
              <header>
                <SectionLabel className="text-accent-spark">Featured</SectionLabel>
                <h2 className="mt-3 font-grotesk text-h2 font-bold leading-tight text-ink-900">
                  本届主赛事
                </h2>
                <p className="mt-3 max-w-[560px] text-body text-ink-500">
                  一年一度的木质无人机创意盛典
                </p>
              </header>
              <FlagshipCard comp={featured} />
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-7">
              <header>
                <SectionLabel>More Events</SectionLabel>
                <h2 className="mt-3 font-grotesk text-h2 font-bold leading-tight text-ink-900">
                  更多赛事
                </h2>
                <p className="mt-3 max-w-[560px] text-body text-ink-500">
                  区域实飞、专项挑战，总有一场适合你
                </p>
              </header>
              <div className="grid gap-6 sm:grid-cols-2 lg:gap-8">
                {others.map((comp) => (
                  <RegionalCard key={comp.id} comp={comp} />
                ))}
              </div>
            </section>
          )}

          <LeaderboardEntryCard flagshipId={featured?.id} total={totalRegistered} />
        </div>
      )}
    </PageContainer>
  )
}
