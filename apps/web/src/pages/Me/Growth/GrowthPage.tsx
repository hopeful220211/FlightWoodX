import { useEffect, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import type { GrowthState, LeaderboardEntry, LeaderboardScope } from '@fwx/shared'
import { PageContainer } from '../../../components/layout/PageContainer'
import { EmptyState } from '../../../components/common/EmptyState'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { useAuthStore } from '../../../stores/authStore'
import { useGrowthStore } from '../../../stores/growthStore'
import { fetchGrowthState, fetchLeaderboard, fetchMyProjects } from './growthApi'
import { ProfileHeader } from './components/ProfileHeader'
import { LevelCard } from './components/LevelCard'
import { PerkGrid } from './components/PerkGrid'
import { BadgeWall } from './components/BadgeWall'
import { TaskCenter } from './components/TaskCenter'
import { Leaderboard } from './components/Leaderboard'
import { ContentTabs } from './components/ContentTabs'
import { RulesPanel } from './components/RulesPanel'

/**
 * 个人成长页 · 游戏化等级体系(RFC-011-E4 + RFC-020 ⑤)。
 *
 * 8 块:① 个人卡 ② 当前等级大卡 ③ 等级特权 ④ 徽章墙 ⑤ 成长任务 ⑥ 排行榜
 *       ⑦ 作品/动态 Tab ⑧ 规则透明入口。
 * 数据真连库:成长状态来自 `GET /api/growth/events`(服务端聚合),排行榜来自
 * `GET /api/growth/leaderboard`,作品来自现有作品接口。
 */
export function GrowthPage() {
  const { status, error, derived, load } = useGrowthStore()

  useEffect(() => {
    load(fetchGrowthState)
  }, [load])

  if (status === 'idle' || status === 'loading') {
    return (
      <PageContainer className="py-8">
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-400">
          <Loader2 size={32} className="animate-spin text-sky-500" aria-hidden="true" />
          <p className="text-body">正在加载你的成长足迹…</p>
        </div>
      </PageContainer>
    )
  }

  if (status === 'error' || !derived) {
    return (
      <PageContainer className="py-8">
        <EmptyState
          icon={<AlertCircle size={22} aria-hidden="true" />}
          title="加载失败"
          description={error || '成长数据暂时无法加载'}
          action={{ label: '重试', onClick: () => load(fetchGrowthState) }}
        />
      </PageContainer>
    )
  }

  return <GrowthContent state={derived} />
}

/** 章节小标 + 标题(套基座令牌,统一张力)。 */
function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="space-y-1">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="font-grotesk text-h3 font-semibold text-ink-900">{title}</h2>
    </div>
  )
}

function GrowthContent({ state }: { state: GrowthState }) {
  const user = useAuthStore((s) => s.user)
  const { totalPoints, currentTier, metrics, unlockedBadgeIds, recentEvents } = state

  const [rulesOpen, setRulesOpen] = useState(false)

  // ⑥ 排行榜:scope 切换驱动重新拉取
  const [scope, setScope] = useState<LeaderboardScope>('global')
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [boardLoading, setBoardLoading] = useState(true)
  useEffect(() => {
    let alive = true
    const run = async () => {
      setBoardLoading(true)
      try {
        const r = await fetchLeaderboard(scope)
        if (alive) setEntries(r.items)
      } catch {
        if (alive) setEntries([])
      } finally {
        if (alive) setBoardLoading(false)
      }
    }
    void run()
    return () => { alive = false }
  }, [scope])

  // ⑦ 作品 Tab:当前用户作品(真实接口)
  const [projects, setProjects] = useState<{ id: string; name: string; thumbnailUrl?: string }[]>([])
  useEffect(() => {
    let alive = true
    fetchMyProjects()
      .then((p) => { if (alive) setProjects(p) })
      .catch(() => { if (alive) setProjects([]) })
    return () => { alive = false }
  }, [])

  return (
    <PageContainer className="space-y-10 py-8">
      {/* ① 顶部个人卡 */}
      <ProfileHeader
        nickname={user?.nickname || user?.username || '小小设计师'}
        avatarUrl={user?.avatarUrl}
        tierName={currentTier.name}
        totalPoints={totalPoints}
        metrics={metrics}
      />

      {/* ② 当前等级大卡 */}
      <LevelCard totalPoints={totalPoints} onHowToEarn={() => setRulesOpen(true)} />

      {/* ③ 等级特权 */}
      <section className="space-y-4">
        <SectionHeading label="Perks" title="等级特权" />
        <PerkGrid totalPoints={totalPoints} />
      </section>

      {/* ④ 徽章墙 */}
      <section className="space-y-4">
        <SectionHeading label="Badges" title="徽章墙" />
        <BadgeWall unlockedIds={unlockedBadgeIds} metrics={metrics} />
      </section>

      {/* ⑤ 成长任务 */}
      <section className="space-y-4">
        <SectionHeading label="Tasks" title="成长任务" />
        <TaskCenter metrics={metrics} />
      </section>

      {/* ⑥ 成长排行榜 */}
      <section className="space-y-4">
        <SectionHeading label="Leaderboard" title="成长排行榜" />
        <Leaderboard
          entries={entries}
          scope={scope}
          onScopeChange={setScope}
          loading={boardLoading}
          meUserId={user?.id}
        />
      </section>

      {/* ⑦ 作品 / 收藏 / 动态 */}
      <section className="space-y-4">
        <SectionHeading label="Collection" title="我的作品与动态" />
        <ContentTabs recentEvents={recentEvents} projects={projects} favorites={[]} />
      </section>

      {/* ⑧ 规则透明入口 */}
      <RulesPanel open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </PageContainer>
  )
}
