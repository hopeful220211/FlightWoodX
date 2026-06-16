import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { BADGE_DEFS, type GrowthState } from '@fwx/shared'
import { PageContainer } from '../../../components/layout/PageContainer'
import { EmptyState } from '../../../components/common/EmptyState'
import { useGrowthStore } from '../../../stores/growthStore'
import { fetchGrowthEvents } from './growthApi'
import { TierLadder } from './components/TierLadder'
import { BadgeGrid } from './components/BadgeGrid'
import { EventTimeline } from './components/EventTimeline'

export function GrowthPage() {
  const nav = useNavigate()
  const { status, error, derived, events, load } = useGrowthStore()

  useEffect(() => {
    load(fetchGrowthEvents)
  }, [load])

  // 加载态
  if (status === 'idle' || status === 'loading') {
    return (
      <PageContainer className="py-8">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-400">
          <Loader2 size={32} className="animate-spin text-sky-500" aria-hidden="true" />
          <p className="text-sm">正在加载你的成长足迹…</p>
        </div>
      </PageContainer>
    )
  }

  // 错误态
  if (status === 'error') {
    return (
      <PageContainer className="py-8">
        <EmptyState
          icon={<AlertCircle size={22} aria-hidden="true" />}
          title="加载失败"
          description={error || '成长数据暂时无法加载'}
          action={{ label: '重试', onClick: () => load(fetchGrowthEvents) }}
        />
      </PageContainer>
    )
  }

  // 空态（已就绪但无事件）
  if (!derived || events.length === 0) {
    return (
      <PageContainer className="py-8">
        <EmptyState
          icon={<Sparkles size={22} aria-hidden="true" />}
          title="还没有成长记录"
          description="完成第一节课程、分享作品或参加赛事，就能点亮你的成长之路。"
          action={{ label: '去学习中心', onClick: () => nav('/learn') }}
        />
      </PageContainer>
    )
  }

  return <GrowthContent state={derived} />
}

function GrowthContent({ state }: { state: GrowthState }) {
  const {
    currentTier, nextTier, totalPoints, pointsToNextTier, progressPercent, unlockedBadgeIds, recentEvents,
  } = state

  return (
    <PageContainer className="py-8 space-y-8">
      {/* ── Hero 身份卡 ── */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-sky-800 to-sky-950 px-6 py-7 text-white shadow-[0_24px_60px_-22px_rgba(23,74,126,0.6)] sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">我的成长</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{currentTier.name}</h1>
              <p className="mt-1.5 max-w-md text-sm text-sky-200/90">{currentTier.blurb}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-sky-300">成长积分</p>
              <p className="text-3xl font-bold tracking-tight">{totalPoints}</p>
            </div>
          </div>
          <div className="mt-6">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={nextTier ? `距「${nextTier.name}」的进度 ${progressPercent}%` : '已达最高身份'}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-300 to-white transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-sky-200/90">
              {nextTier ? (
                <>还差 <span className="font-bold text-white">{pointsToNextTier}</span> 分成为「{nextTier.name}」</>
              ) : (
                '🎉 已达最高身份，继续保持！'
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── 身份阶梯 ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">身份阶梯</h2>
        <TierLadder currentTierId={currentTier.id} totalPoints={totalPoints} />
      </section>

      {/* ── 徽章墙 ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">我的徽章</h2>
          <span className="text-sm text-ink-400">{unlockedBadgeIds.length} / {BADGE_DEFS.length} 枚</span>
        </div>
        <BadgeGrid unlockedIds={unlockedBadgeIds} />
      </section>

      {/* ── 成长足迹 ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-ink-900">成长足迹</h2>
        <EventTimeline events={recentEvents} />
      </section>
    </PageContainer>
  )
}
