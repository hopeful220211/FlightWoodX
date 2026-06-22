/**
 * 赛事详情页（RFC-018 P2 / RFC-011 §4 赛事站）。
 *
 * 多区块年度赛事站：DetailHero（主视觉 + 操作区）→ AnchorNav（sticky 锚点）→
 * 赛事介绍 → 赛程赛段 → 奖项设置 → 参赛指南 → 排行榜·获奖。
 * 功能数据来自 API（useCompetition），富区块文案/配图来自 content 模块（editorialFor）。
 */
import { useParams, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'
import { SectionLabel } from '../../components/common/SectionLabel'
import { useAuthStore } from '../../stores/authStore'
import { useCompetition, useRegister } from '../../hooks/useCompetitions'
import { editorialFor, SECTION_IDS } from './content/competitionContent'
import { DetailHero } from './components/DetailHero'
import { AnchorNav } from './components/AnchorNav'
import { StagesTimeline } from './components/StagesTimeline'
import { AwardsSection } from './components/AwardsSection'
import { GuideSection } from './components/GuideSection'
import { LeaderboardPreview } from './components/LeaderboardPreview'

/** 评分维度 → 中文标签。 */
const SCORING_LABEL: Record<string, string> = {
  design: '设计',
  programming: '编程逻辑',
  creativity: '创意',
  taskCompletion: '任务完成',
}

export function CompetitionDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: comp, isLoading, isError, error } = useCompetition(id)
  const register = useRegister(id)
  const token = useAuthStore((s) => s.token)
  const isGuest = useAuthStore((s) => s.user?.isGuest)

  if (isLoading) {
    return (
      <PageContainer className="py-8 space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-surface-ice" />
        <div className="h-80 animate-pulse rounded-card bg-surface-ice" />
      </PageContainer>
    )
  }

  if (isError || !comp) {
    return (
      <PageContainer className="py-8">
        <Card className="text-center py-12">
          <AlertCircle size={28} className="mx-auto text-error mb-2" />
          <p className="text-sm text-ink-600">
            {(error as Error)?.message || '赛事不存在或加载失败'}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => nav('/competitions')}>
            返回赛事中心
          </Button>
        </Card>
      </PageContainer>
    )
  }

  const editorial = editorialFor(comp)
  const isLoggedIn = !!token && !isGuest

  const handleRegister = () => {
    register.mutate(undefined, {
      onSuccess: () => toast.push('success', '报名成功！'),
      onError: (e) => toast.push('error', (e as Error).message || '报名失败，请稍后重试'),
    })
  }

  return (
    <PageContainer className="py-6 space-y-6">
      <Breadcrumb items={[{ label: '赛事中心', to: '/competitions' }, { label: comp.name }]} />

      <DetailHero
        name={comp.name}
        status={comp.status}
        heroImage={editorial.heroImage}
        tagline={editorial.tagline}
        startTime={comp.startTime}
        endTime={comp.endTime}
        registeredCount={comp.registeredCount}
        isRegistered={!!comp.isRegistered}
        isLoggedIn={isLoggedIn}
        registering={register.isPending}
        onRegister={handleRegister}
        onSubmit={() => nav(`/competitions/${id}/submit`)}
        onLeaderboard={() => nav(`/competitions/${id}/leaderboard`)}
        onRequireLogin={() => nav('/auth')}
      />

      <AnchorNav />

      {/* 赛事介绍 */}
      <section
        id={SECTION_IDS.intro}
        className="scroll-mt-24 space-y-12 rounded-card bg-surface-white px-6 py-16 md:px-10 md:py-20"
      >
        <div className="space-y-4">
          <SectionLabel>About</SectionLabel>
          <h2 className="font-grotesk text-h2 font-semibold text-ink-900">赛事介绍</h2>
          <div className="space-y-4">
            {editorial.intro.map((para, i) => (
              <p key={i} className="max-w-[560px] text-body text-ink-600">
                {para}
              </p>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* 赛道 */}
          <div className="rounded-card bg-surface-ice p-8">
            <SectionLabel>Track</SectionLabel>
            <h3 className="mt-3 font-grotesk text-h3 font-semibold text-ink-900">赛道</h3>
            <p className="mt-3 text-body font-medium text-ink-700">{comp.trackConfig?.name}</p>
            {comp.trackConfig?.description && (
              <p className="mt-2 max-w-[560px] text-body text-ink-500">
                {comp.trackConfig.description}
              </p>
            )}
          </div>

          {/* 评分维度 */}
          <div className="rounded-card bg-surface-ice p-8">
            <SectionLabel>Scoring</SectionLabel>
            <h3 className="mt-3 font-grotesk text-h3 font-semibold text-ink-900">评分维度</h3>
            <ul className="mt-5 space-y-3">
              {Object.entries(comp.scoringRules || {}).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-body">
                  <span className="text-ink-600">{SCORING_LABEL[k] || k}</span>
                  <span className="font-grotesk font-semibold text-accent-spark">
                    {v as number} 分
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-ink-400">
              不评纯竞速，看设计巧思、编程逻辑、创意表达与任务完成。
            </p>
          </div>
        </div>

        {/* 赛制说明 */}
        {comp.rulesDescription && (
          <div className="rounded-card bg-surface-ice p-8">
            <SectionLabel>Rules</SectionLabel>
            <h3 className="mt-3 font-grotesk text-h3 font-semibold text-ink-900">赛制说明</h3>
            <p className="mt-3 max-w-[560px] whitespace-pre-line text-body text-ink-600">
              {comp.rulesDescription}
            </p>
          </div>
        )}
      </section>

      <StagesTimeline stages={editorial.stages} />
      <AwardsSection awards={editorial.awards} />
      <GuideSection guide={editorial.guide} />

      <div className="py-8 md:py-12">
        <LeaderboardPreview competitionId={comp.id} status={comp.status} />
      </div>
    </PageContainer>
  )
}
