/**
 * 工作台「个人飞行创作中心」视图数据契约 + 示例数据(RFC 工作台改版 · §5)。
 *
 * 本轮前端先行:用示例值把每个模块效果呈现出来,**字段已按契约预留**,
 * 后端接通后把 SAMPLE_DASHBOARD 替换为真实接口数据即可,组件无需改。
 *
 * ⚠️ 成长相关(等级 / 徽章 / 任务)的「规则与类型」一律来自 `@fwx/shared`
 * (levelOf / BADGE_DEFS / GROWTH_TASKS),本文件只承载视图层的展示数据,
 * 不重复定义成长契约类型。
 */

export type WorkCategory = 'drone' | 'aircraft' | 'part'
export type WorkStatus = 'draft' | 'published'

/** 用户身份(等级由 totalPoints 经 @fwx/shared 的 levelOf 推导,title 为称号示意)。 */
export interface DashboardUser {
  name: string
  avatarUrl?: string
  /** 累计成长值;等级徽章用 levelOf(totalPoints) 求段位 + 小等级。 */
  totalPoints: number
  /** 称号示意(如「木艺飞行家」)。 */
  title: string
}

/** 5 项成长数据(Hero 数据卡)。 */
export interface DashboardStats {
  courseCount: number
  studyHours: number
  projectCount: number
  completedLessons: number
  totalLessons: number
  achievementCount: number
}

/** 学习旅程。 */
export interface LearningJourney {
  courseName: string
  stageName: string
  currentLesson: string
  /** 0–100。 */
  progress: number
  nextActionUrl: string
}

/** 本周目标任务(comingSoon=true 的任务随仿真上线再激活)。 */
export interface WeeklyGoal {
  title: string
  completed: boolean
  targetUrl: string
  comingSoon?: boolean
}

/** 成就徽章(名称/条件以 @fwx/shared 的 BADGE_DEFS 为准;iconKey 供前端选图标)。 */
export interface DashboardAchievement {
  name: string
  iconKey: string
  unlocked: boolean
  conditionText: string
}

export type ActivityType = 'like' | 'comment' | 'review' | 'competition'

/** 近期动态。 */
export interface DashboardActivity {
  id: string
  type: ActivityType
  text: string
  relatedWorkId?: string
  createdAt: string
}

/** 作品卡。 */
export interface DashboardWork {
  id: string
  title: string
  category: WorkCategory
  coverImage?: string
  updatedAt: string
  views: number
  likes: number
  status: WorkStatus
}

export interface DashboardData {
  user: DashboardUser
  stats: DashboardStats
  learningJourney: LearningJourney
  weeklyGoals: WeeklyGoal[]
  achievements: DashboardAchievement[]
  activities: DashboardActivity[]
  works: DashboardWork[]
}

/** 本周目标状态(示例)。 */
export const WEEKLY_GOAL_DONE = 3
export const WEEKLY_GOAL_TOTAL = 5
export const WEEKLY_RESET_DAYS = 2

/** 作品分类 Tab 文案。 */
export const WORK_CATEGORY_LABELS: { key: 'all' | WorkCategory; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'drone', label: '无人机' },
  { key: 'aircraft', label: '飞行器' },
  { key: 'part', label: '零部件' },
]

/** 作品排序文案。 */
export type WorkSortKey = 'recent' | 'views' | 'likes' | 'created'
export const WORK_SORT_LABELS: { key: WorkSortKey; label: string }[] = [
  { key: 'recent', label: '最近修改' },
  { key: 'views', label: '最多浏览' },
  { key: 'likes', label: '最多点赞' },
  { key: 'created', label: '创建时间' },
]

/** 作品卡示例封面(复用仓库内已有木质无人机实物图占位;真封面后端接入后替换)。 */
const SAMPLE_COVER = '/resource/picture/UI/web_3.png'

/**
 * 示例数据。文案取自任务文档 §7;数值取自 §3.2 / §3.3。
 * 接真实接口时整体替换本常量即可。
 */
export const SAMPLE_DASHBOARD: DashboardData = {
  user: {
    name: '苏小航',
    avatarUrl: undefined,
    totalPoints: 360, // 经 levelOf → 设计师段位;示例值
    title: '木艺飞行家',
  },
  stats: {
    courseCount: 28,
    studyHours: 128,
    projectCount: 6,
    completedLessons: 18,
    totalLessons: 36,
    achievementCount: 14,
  },
  learningJourney: {
    courseName: '木艺无人机入门 · 进阶课程',
    stageName: '动力系统设计',
    currentLesson: '电机与螺旋桨的匹配',
    progress: 65,
    nextActionUrl: '/learn',
  },
  weeklyGoals: [
    { title: '学习一节《结构强度基础》课程', completed: true, targetUrl: '/learn' },
    { title: '完成一个新设计并保存', completed: true, targetUrl: '/design' },
    { title: '参与一次仿真试飞', completed: false, targetUrl: '/simulator', comingSoon: true },
    { title: '为作品添加备注信息', completed: true, targetUrl: '/dashboard' },
    { title: '浏览社区优秀作品', completed: false, targetUrl: '/community' },
  ],
  achievements: [
    { name: '初次起飞', iconKey: 'first_flight', unlocked: true, conditionText: '完成首次设计与保存' },
    { name: '设计达人', iconKey: 'prolific_creator', unlocked: true, conditionText: '完成 3 个设计项目' },
    { name: '社区新星', iconKey: 'popular_creator', unlocked: true, conditionText: '作品获得 10 个点赞' },
    { name: '敬请期待', iconKey: 'locked', unlocked: false, conditionText: '完成首次仿真试飞解锁' },
  ],
  activities: [
    { id: 'a1', type: 'like', text: '你的作品「青鸟·轻量竞速」获得了 24 个点赞', relatedWorkId: 'w1', createdAt: '2026-06-22T09:10:00.000Z' },
    { id: 'a2', type: 'comment', text: '同学「林想」评论了你的「四轴探索者」', relatedWorkId: 'w2', createdAt: '2026-06-21T15:30:00.000Z' },
    { id: 'a3', type: 'review', text: '老师点评了你的「动力系统设计」作业', relatedWorkId: undefined, createdAt: '2026-06-20T11:00:00.000Z' },
  ],
  works: [
    { id: 'w1', title: '青鸟·轻量竞速', category: 'drone', coverImage: SAMPLE_COVER, updatedAt: '2026-06-22T09:00:00.000Z', views: 312, likes: 24, status: 'published' },
    { id: 'w2', title: '四轴探索者', category: 'drone', coverImage: SAMPLE_COVER, updatedAt: '2026-06-20T18:00:00.000Z', views: 156, likes: 12, status: 'published' },
    { id: 'w3', title: '林间穿越者', category: 'aircraft', coverImage: SAMPLE_COVER, updatedAt: '2026-06-18T14:00:00.000Z', views: 98, likes: 7, status: 'draft' },
    { id: 'w4', title: '迷你护卫', category: 'drone', coverImage: SAMPLE_COVER, updatedAt: '2026-06-15T10:00:00.000Z', views: 64, likes: 5, status: 'draft' },
    { id: 'w5', title: '碳纤机臂组件', category: 'part', coverImage: SAMPLE_COVER, updatedAt: '2026-06-12T16:00:00.000Z', views: 41, likes: 3, status: 'published' },
  ],
}
