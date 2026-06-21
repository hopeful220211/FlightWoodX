/**
 * 赛事站「编辑内容」单一事实来源（RFC-018 P2）。
 *
 * 为什么放前端：富区块（创作流程/奖项/参赛指南/配图）是**页面文案 + 配图**，
 * 不是后端数据，@fwx/shared 的 Competition 契约里也没有这些字段（禁止改契约）。
 * 功能数据（赛事名/状态/时间/报名数/排行榜）一律来自 API，不在这里伪造。
 *
 * 赛事 → 内容映射用**显式名称注册表**（Codex 评审①采纳）：归一化完整赛事名 →
 * contentKey → editorial/hero。未知赛事回退 generic，不绑 mongo ObjectId、不做模糊匹配。
 */
import type { Competition } from '@fwx/shared'

export type ContentKey = 'annual-2026' | 'regional-2026' | 'generic'

/** 创作流程的一个赛段（设计 / 编程 / 仿真试飞）。无真实每段日期，不伪装赛程。 */
export interface StageContent {
  key: string
  index: number
  title: string
  summary: string
  /** public 下的配图路径，如 /competitions/stage-design.png */
  image: string
}

/** 奖项档位（结构性内容，非具体获奖名单）。 */
export interface AwardContent {
  tier: 'gold' | 'silver' | 'bronze' | 'special'
  title: string
  detail: string
  /** 名额描述，如「1 名」「3 名」。 */
  count?: string
}

/** 参赛指南的一步。 */
export interface GuideStep {
  index: number
  title: string
  detail: string
}

export interface CompetitionEditorial {
  contentKey: ContentKey
  /** 详情页 hero 配图。 */
  heroImage: string
  /** 口号/副标题。 */
  tagline: string
  /** 赛事介绍段落。 */
  intro: string[]
  stages: StageContent[]
  awards: AwardContent[]
  guide: GuideStep[]
}

/** 锚点导航 section id 常量（AnchorNav 与各区块共用，避免硬编码字符串漂移）。 */
export const SECTION_IDS = {
  intro: 'comp-intro',
  stages: 'comp-stages',
  awards: 'comp-awards',
  guide: 'comp-guide',
  leaderboard: 'comp-leaderboard',
} as const
export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS]

/** landing 顶部横幅配图。 */
export const LANDING_HERO = '/competitions/hero-center.png'

// ===== 通用编辑内容（「翼创未来」系列两赛事共用格式）=====

const STAGES_COMMON: StageContent[] = [
  {
    key: 'design',
    index: 1,
    title: '设计',
    summary: '在零件库里挑机身、支架、保护罩，像搭积木一样拼出自己的木质无人机。',
    image: '/competitions/stage-design.png',
  },
  {
    key: 'program',
    index: 2,
    title: '编程',
    summary: '用图形化积木给无人机写"飞行计划"：起飞、转弯、穿越障碍、精准降落。',
    image: '/competitions/stage-program.png',
  },
  {
    key: 'sim',
    index: 3,
    title: '仿真试飞',
    summary: '在 3D 仿真场景里试飞你的设计，反复调整，飞稳飞准再提交参赛。',
    image: '/competitions/stage-sim.png',
  },
]

const AWARDS_COMMON: AwardContent[] = [
  { tier: 'gold', title: '金奖', detail: '综合评分最高，作品兼具设计巧思与飞行表现。', count: '1 名' },
  { tier: 'silver', title: '银奖', detail: '设计与编程俱佳，飞行任务完成出色。', count: '2 名' },
  { tier: 'bronze', title: '铜奖', detail: '完成全部赛段并取得优良成绩。', count: '3 名' },
  { tier: 'special', title: '最佳创意奖', detail: '不看名次，奖励最有想象力的结构或飞行方案。', count: '若干' },
]

const GUIDE_COMMON: GuideStep[] = [
  { index: 1, title: '报名', detail: '登录后在赛事详情页点击"报名参加"，即可加入本届赛事。' },
  { index: 2, title: '设计', detail: '进入设计工作台，挑选零件拼装出你的木质无人机。' },
  { index: 3, title: '编程', detail: '在编程界面用积木编排飞行计划，让无人机听你的指挥。' },
  { index: 4, title: '仿真', detail: '在仿真场景里试飞，观察成绩，不断优化你的设计与程序。' },
  { index: 5, title: '提交', detail: '满意后在详情页"提交参赛"选择作品提交，等待评委评分进榜。' },
]

const EDITORIAL: Record<ContentKey, CompetitionEditorial> = {
  'annual-2026': {
    contentKey: 'annual-2026',
    heroImage: '/competitions/annual-2026-cover.png',
    tagline: '一年一度的木质无人机创意盛典，仿真先行，人人可参与',
    intro: [
      '2026 翼创未来·年度创意赛是面向全国青少年的木质无人机创意挑战。无需购买硬件，全程在仿真中完成——设计、编程、试飞，一台电脑就能参赛。',
      '比赛不比纯竞速，而是看设计巧思、编程逻辑、创意表达与任务完成。我们想看到的，是你独一无二的想法。',
    ],
    stages: STAGES_COMMON,
    awards: AWARDS_COMMON,
    guide: GUIDE_COMMON,
  },
  'regional-2026': {
    contentKey: 'regional-2026',
    heroImage: '/competitions/regional-cover.png',
    tagline: '秋季区域实飞赛，把仿真里的设计带到真实赛场',
    intro: [
      '2026 翼创未来·秋季区域实飞赛是面向各区域的线下体验赛，鼓励同学们走出屏幕、在真实场地里展示自己的木质无人机。',
      '从仿真到实飞，是一次完整的工程体验。本届为已结束场次，可查看最终成绩与获奖公示。',
    ],
    stages: STAGES_COMMON,
    awards: AWARDS_COMMON,
    guide: GUIDE_COMMON,
  },
  generic: {
    contentKey: 'generic',
    heroImage: LANDING_HERO,
    tagline: '设计、编程、仿真试飞，开启你的木质无人机之旅',
    intro: [
      '本赛事采用"设计 → 编程 → 仿真试飞"的创作流程，仿真先行，无需硬件即可全程参与。',
    ],
    stages: STAGES_COMMON,
    awards: AWARDS_COMMON,
    guide: GUIDE_COMMON,
  },
}

/** 归一化赛事名：去全部空白，统一中点 ·。 */
function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').replace(/[·•・]/g, '·')
}

const NAME_TO_KEY: Record<string, ContentKey> = {
  '2026翼创未来·年度创意赛': 'annual-2026',
  '2026翼创未来·秋季区域实飞赛': 'regional-2026',
}

export function contentKeyFor(comp: Pick<Competition, 'name'>): ContentKey {
  return NAME_TO_KEY[normalizeName(comp.name)] ?? 'generic'
}

export function editorialFor(comp: Pick<Competition, 'name'>): CompetitionEditorial {
  return EDITORIAL[contentKeyFor(comp)]
}

export function heroImageFor(comp: Pick<Competition, 'name'>): string {
  return editorialFor(comp).heroImage
}

/** landing 旗舰赛事判定：年度赛事为旗舰。 */
export function isFlagship(comp: Pick<Competition, 'name'>): boolean {
  return contentKeyFor(comp) === 'annual-2026'
}
