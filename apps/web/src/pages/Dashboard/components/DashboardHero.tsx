import type { JSX } from 'react'
import { Pencil, Sparkles, BookOpen, Clock, Boxes, GraduationCap, Trophy } from 'lucide-react'
import { levelOf } from '@fwx/shared'
import { cn } from '../../../utils/cn'
import { BigStat } from '../../../components/common/BigStat'
import { PillButton } from '../../../components/common/PillButton'
import type { DashboardUser, DashboardStats } from '../dashboardData'

/**
 * DashboardHero — 工作台「个人飞行创作中心」Hero 个人欢迎区（任务文档 §3.2）。
 *
 * 纯展示组件，props 驱动：天空+木质无人机背景图（无人机已在图里，不另放），
 * 左侧通透玻璃卡叠在天空上，含头像+等级徽章、欢迎语、5 项成长数据、右下编辑按钮。
 *
 * - 等级徽章接真实成长体系：`levelOf(user.totalPoints)` 求段位（学徒/设计师/首席）+ `Lv.N`。
 * - 冷启动（§3.2 末）：新用户数据基本为 0 时，不显示大面积 0，改为引导胶囊。
 */
export interface DashboardHeroProps {
  user: DashboardUser
  stats: DashboardStats
  onEditProfile?: () => void
  onPrimary?: () => void
  primaryLabel?: string
}

/** 5 项成长数据卡（用于非冷启动态）。 */
function statItems(stats: DashboardStats) {
  return [
    { key: 'course', label: '学习课程', value: stats.courseCount, unit: undefined as string | undefined, Icon: BookOpen },
    { key: 'hours', label: '学习时长', value: stats.studyHours, unit: 'h', Icon: Clock },
    { key: 'project', label: '设计项目', value: stats.projectCount, unit: undefined, Icon: Boxes },
    {
      key: 'lessons',
      label: '完成课时',
      // 复合值：分母小一号 + 收紧斜杠，避免 5 字符在窄列里占满整列。
      value: (
        <span className="tabular-nums">
          {stats.completedLessons}
          <span className="text-[0.62em] font-medium text-ink-400">/{stats.totalLessons}</span>
        </span>
      ),
      unit: undefined,
      Icon: GraduationCap,
    },
    { key: 'achievement', label: '获得成就', value: stats.achievementCount, unit: undefined, Icon: Trophy },
  ]
}

/** 冷启动判定：核心动作全为 0 视为新用户（§3.2）。 */
function isColdStart(stats: DashboardStats): boolean {
  return stats.courseCount + stats.projectCount + stats.completedLessons === 0
}

/** 冷启动引导胶囊文案（§3.2 / §8.6）。 */
const COLD_START_PILLS = ['开启第一节课', '完成第一个设计', '解锁初次起飞']

/** 头像：有图用图，无则用姓名首字符占位。 */
function HeroAvatar({ user, levelName }: { user: DashboardUser; levelName: string }): JSX.Element {
  const initial = user.name.trim().charAt(0) || '飞'
  return (
    <div className="relative shrink-0">
      <div className="h-20 w-20 overflow-hidden rounded-full bg-sky-100 shadow-sky-glow ring-4 ring-white/80 sm:h-24 sm:w-24">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={`${user.name} 的头像`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sky-gradient font-display text-3xl text-sky-700 sm:text-4xl">
            {initial}
          </div>
        )}
      </div>
      {/* 角标等级徽章：段位 + Lv.N，金色点缀 */}
      <span
        className={cn(
          'absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill',
          'border border-accent-gold/40 bg-white px-2.5 py-0.5 text-xs font-semibold text-sky-900 shadow-soft',
        )}
      >
        <span className="text-accent-gold">★</span> {levelName}
      </span>
    </div>
  )
}

export function DashboardHero({
  user,
  stats,
  onEditProfile,
  onPrimary,
  primaryLabel,
}: DashboardHeroProps): JSX.Element {
  const level = levelOf(user.totalPoints)
  const levelName = `${level.tier.name} · Lv.${level.subLevel}`
  const coldStart = isColdStart(stats)
  const items = statItems(stats)

  return (
    <section
      aria-label="个人欢迎区"
      className={cn(
        'relative isolate overflow-hidden rounded-[24px] shadow-sky-glow',
        'bg-sky-hero bg-cover bg-center',
      )}
      style={{ backgroundImage: "url('/dashboard/hero-drone.png')" }}
    >
      {/* 左侧轻柔渐隐，保证玻璃卡上文字可读；右侧露出无人机 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/10 to-transparent"
      />

      <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)] lg:p-9">
        {/* 左侧通透玻璃卡 */}
        <div
          className={cn(
            'rounded-card border border-white/60 bg-white/72 backdrop-blur-md',
            'shadow-soft ring-1 ring-sky-100/60',
            'p-5 sm:p-7',
          )}
        >
          {/* 头像 + 欢迎语 */}
          <div className="flex items-center gap-5 sm:gap-6">
            <HeroAvatar user={user} levelName={levelName} />
            <div className="min-w-0">
              {/* 仪表盘标题档（~28-32px），非首页 4.5vw 营销大字，避免「苏小/航」单字孤行 */}
              <h1 className="text-balance font-display text-[1.625rem] leading-tight text-sky-900 sm:text-[2rem]">
                欢迎回来，<span className="whitespace-nowrap">{user.name}</span>
              </h1>
              <p className="mt-1.5 text-base text-sky-700/90 sm:text-body">从一块木头，到一架会飞的无人机。</p>
              <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent-gold">
                <Sparkles className="h-4 w-4" strokeWidth={2.2} aria-hidden />
                {user.title}
              </p>
            </div>
          </div>

          {/* 数据区：冷启动 → 引导胶囊；否则 5 项成长数据卡 */}
          {coldStart ? (
            <div className="mt-6">
              <p className="text-body font-medium text-sky-900">三步开启你的第一架无人机</p>
              <ul className="mt-3 flex flex-wrap gap-2.5">
                {COLD_START_PILLS.map((pill, i) => (
                  <li
                    key={pill}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2',
                      'border border-sky-200 bg-sky-50/90 text-sm font-medium text-sky-700',
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-spark text-[11px] font-semibold text-white">
                      {i + 1}
                    </span>
                    {pill}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {items.map(({ key, label, value, unit, Icon }) => (
                <div
                  key={key}
                  className={cn(
                    'min-w-0 overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-3.5',
                    'shadow-[0_6px_18px_rgba(42,136,219,0.10)]',
                  )}
                >
                  <Icon className="h-4 w-4 text-accent-spark" strokeWidth={2.2} aria-hidden />
                  <BigStat className="mt-2" size="sm" value={value} unit={unit} label={label} />
                </div>
              ))}
            </dl>
          )}

          {/* 行动按钮：可选主按钮 + 编辑个人资料（右下） */}
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            {onPrimary ? (
              <PillButton variant="primary" arrow onClick={onPrimary} className="min-w-[160px]">
                {primaryLabel ?? '继续学习'}
              </PillButton>
            ) : null}
            <PillButton
              variant="ghost"
              onClick={onEditProfile}
              className="min-h-[44px] min-w-[150px] bg-white/70"
            >
              <Pencil className="mr-2 h-4 w-4" strokeWidth={2.2} aria-hidden />
              编辑个人资料
            </PillButton>
          </div>
        </div>

        {/* 右列留给背景里的木质无人机（图已含），窄屏隐藏占位以免压缩玻璃卡 */}
        <div aria-hidden className="hidden lg:block" />
      </div>
    </section>
  )
}
