import { useNavigate } from 'react-router-dom'
import { PageContainer } from '../../components/layout/PageContainer'
import { useToast } from '../../components/common/Toast'
import { DashboardHero } from './components/DashboardHero'
import { LearningJourneyCard } from './components/LearningJourneyCard'
import { WeeklyGoalsCard } from './components/WeeklyGoalsCard'
import { MyGrowthCard } from './components/MyGrowthCard'
import { MyWorks } from './components/MyWorks'
import {
  SAMPLE_DASHBOARD,
  WEEKLY_GOAL_DONE,
  WEEKLY_GOAL_TOTAL,
  WEEKLY_RESET_DAYS,
  type WeeklyGoal,
} from './dashboardData'

/**
 * 工作台「个人飞行创作中心」(工作台改版)。
 *
 * 信息架构(§2):Hero 个人欢迎区 → 一排三卡(学习旅程 | 本周目标 | 成就徽章+近期动态)
 * → 我的作品合集。
 *
 * 本轮前端先行:数据来自 `SAMPLE_DASHBOARD`(字段按 §5 契约预留),后端接通后把数据源
 * 换成真实接口即可,组件无需改动。仿真相关(RFC-015 未上线)统一做「即将开放」占位。
 * 顶部导航的「工作台」高亮由现有 Navbar 的 active 态自动呈现,未改共享导航。
 */
export function DashboardPage() {
  const nav = useNavigate()
  const toast = useToast()
  const data = SAMPLE_DASHBOARD

  const comingSoon = () => toast.push('info', '该功能即将开放,敬请期待')

  const handleGoal = (g: WeeklyGoal) => {
    if (g.comingSoon) comingSoon()
    else nav(g.targetUrl)
  }

  return (
    <PageContainer className="space-y-6 py-8">
      {/* Hero 个人欢迎区 */}
      <DashboardHero
        user={data.user}
        stats={data.stats}
        onEditProfile={() => nav('/me')}
        onPrimary={() => nav('/design')}
        primaryLabel="新建设计"
      />

      {/* 一排三卡 */}
      <div className="grid gap-6 lg:grid-cols-3">
        <LearningJourneyCard
          journey={data.learningJourney}
          onContinue={() => nav(data.learningJourney.nextActionUrl)}
          onViewAll={() => nav('/learn')}
        />
        <WeeklyGoalsCard
          goals={data.weeklyGoals}
          done={WEEKLY_GOAL_DONE}
          total={WEEKLY_GOAL_TOTAL}
          resetDays={WEEKLY_RESET_DAYS}
          onGoalClick={handleGoal}
        />
        <MyGrowthCard
          totalPoints={data.user.totalPoints}
          achievements={data.achievements}
          activities={data.activities}
          onViewDetail={() => nav('/me/growth')}
          onActivityClick={() => nav('/me/growth')}
        />
      </div>

      {/* 我的作品 */}
      <MyWorks
        works={data.works}
        onNewDesign={() => nav('/design')}
        onContinueEdit={() => nav('/design')}
        onPublish={comingSoon}
        onDuplicate={comingSoon}
        onDelete={comingSoon}
      />
    </PageContainer>
  )
}
