/**
 * 赛事详情页主视觉（RFC-018 P2 / RFC-011 §4 赛事站）。
 *
 * 用 editorial.heroImage 作整幅背景，叠加赛事名 / 状态徽章 / tagline /
 * 起止时间 / 报名数，并承载操作区（报名 / 提交参赛 / 排行榜）。
 * 操作区状态由「登录 + 报名 + 赛事状态」三者共同决定，按状态矩阵渲染。
 * framer-motion 克制入场 + 轻视差，useReducedMotion 守护；hero 图 eager 加载。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { Calendar, Users, Upload, BarChart3, CheckCircle2, LogIn } from 'lucide-react'
import type { Competition } from '@fwx/shared'
import { Button } from '../../../components/common/Button'
import {
  COMPETITION_STATUS_LABEL,
  COMPETITION_STATUS_CLASS,
} from '../../../hooks/useCompetitions'

export interface DetailHeroProps {
  /** 赛事名 */
  name: string
  status: Competition['status']
  heroImage: string
  tagline: string
  startTime: string
  endTime: string
  registeredCount: number
  /** 是否已报名 */
  isRegistered: boolean
  /** 是否登录（真实用户，非游客）。未登录/游客均为 false。 */
  isLoggedIn: boolean
  /** 报名中（mutation pending） */
  registering: boolean
  onRegister: () => void
  onSubmit: () => void
  onLeaderboard: () => void
  onRequireLogin: () => void
}

export function DetailHero({
  name,
  status,
  heroImage,
  tagline,
  startTime,
  endTime,
  registeredCount,
  isRegistered,
  isLoggedIn,
  registering,
  onRegister,
  onSubmit,
  onLeaderboard,
  onRequireLogin,
}: DetailHeroProps): JSX.Element {
  const reduce = useReducedMotion()
  const isClosedOrDraft = status === 'closed' || status === 'draft'
  const canAct = status === 'open' || status === 'running'

  /** 主操作按钮。优先级：赛事已结束 > 未登录 > 已报名 > 可报名。 */
  function renderPrimary(): JSX.Element {
    if (isClosedOrDraft) {
      return (
        <Button size="lg" disabled>
          赛事已结束
        </Button>
      )
    }
    if (!isLoggedIn) {
      return (
        <Button size="lg" onClick={onRequireLogin} leftIcon={<LogIn size={18} />}>
          登录后参加
        </Button>
      )
    }
    if (isRegistered) {
      return (
        <span className="inline-flex min-h-[48px] items-center gap-2 rounded-md bg-accent-leaf/15 px-5 text-base font-semibold text-accent-leaf">
          <CheckCircle2 size={18} /> 已报名
        </span>
      )
    }
    return (
      <Button size="lg" onClick={onRegister} loading={registering} disabled={!canAct}>
        报名参加
      </Button>
    )
  }

  /**
   * 提交参赛点击：结束/草稿不可点；未登录跳认证页；已报名提交。
   * 登录但未报名时按钮置灰（由主按钮引导先报名）。
   */
  function handleSubmitClick(): void {
    if (isClosedOrDraft) return
    if (!isLoggedIn) return onRequireLogin()
    if (isRegistered) return onSubmit()
  }
  // 可点：进行中且（未登录→去登录 / 已报名→去提交）。结束、或登录未报名时置灰。
  const submitDisabled = isClosedOrDraft || (isLoggedIn && !isRegistered)
  const submitHint = isClosedOrDraft
    ? '赛事已结束'
    : !isLoggedIn
      ? '登录后提交'
      : !isRegistered
        ? '请先报名'
        : undefined

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink-900 shadow-soft ring-1 ring-sky-100">
      {/* 主视觉背景 + 轻视差 */}
      <motion.img
        src={heroImage}
        alt={name}
        loading="eager"
        initial={reduce ? false : { scale: 1.08 }}
        animate={reduce ? undefined : { scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* 渐变压暗，保证文字可读 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/55 to-ink-900/25"
      />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="relative flex min-h-[22rem] flex-col justify-end gap-6 p-6 md:min-h-[28rem] md:p-10 lg:flex-row lg:items-end lg:justify-between"
      >
        {/* 文案区 */}
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${COMPETITION_STATUS_CLASS[status]}`}
            >
              {COMPETITION_STATUS_LABEL[status]}
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-white md:text-4xl lg:text-5xl">
            {name}
          </h1>
          <p className="mt-3 max-w-xl text-base text-white/85 md:text-lg">{tagline}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/75">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={15} />
              {new Date(startTime).toLocaleDateString()} —{' '}
              {new Date(endTime).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={15} />
              {registeredCount} 人报名
            </span>
          </div>
        </div>

        {/* 操作区 */}
        <div className="flex w-full flex-col gap-3 sm:max-w-sm lg:w-auto lg:min-w-[16rem]">
          {renderPrimary()}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleSubmitClick}
              disabled={submitDisabled}
              leftIcon={<Upload size={18} />}
              title={submitHint}
              className="flex-1"
            >
              提交参赛
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={onLeaderboard}
              leftIcon={<BarChart3 size={18} />}
              className="flex-1 bg-white/10 text-white hover:bg-white/20"
            >
              排行榜
            </Button>
          </div>
          {!isClosedOrDraft && submitHint && !isRegistered && (
            <p className="text-xs text-white/65">
              {submitHint === '请先报名' ? '报名后即可提交你的参赛作品' : submitHint}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  )
}
