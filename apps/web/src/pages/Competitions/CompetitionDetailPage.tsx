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
        <div className="h-8 w-1/3 animate-pulse rounded bg-sky-50" />
        <div className="h-80 animate-pulse rounded-3xl bg-sky-50" />
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
      <section id={SECTION_IDS.intro} className="scroll-mt-24 py-8 md:py-12">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wider text-sky-500">About</p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 md:text-3xl">
            赛事介绍
          </h2>
        </div>

        <div className="space-y-4">
          {editorial.intro.map((para, i) => (
            <p key={i} className="max-w-3xl text-base leading-relaxed text-ink-600">
              {para}
            </p>
          ))}
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* 赛道 */}
          <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-sky-100">
            <h3 className="font-display text-lg font-bold text-ink-900">赛道</h3>
            <p className="mt-2 text-sm font-medium text-ink-700">{comp.trackConfig?.name}</p>
            {comp.trackConfig?.description && (
              <p className="mt-1 text-sm text-ink-500">{comp.trackConfig.description}</p>
            )}
          </div>

          {/* 评分维度 */}
          <div className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-sky-100">
            <h3 className="font-display text-lg font-bold text-ink-900">评分维度</h3>
            <ul className="mt-3 space-y-2">
              {Object.entries(comp.scoringRules || {}).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">{SCORING_LABEL[k] || k}</span>
                  <span className="font-semibold text-sky-600">{v as number} 分</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-ink-400">
              不评纯竞速，看设计巧思、编程逻辑、创意表达与任务完成。
            </p>
          </div>
        </div>

        {/* 赛制说明 */}
        {comp.rulesDescription && (
          <div className="mt-4 rounded-2xl bg-sky-50/60 p-6 ring-1 ring-sky-100">
            <h3 className="font-display text-lg font-bold text-ink-900">赛制说明</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
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
