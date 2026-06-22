/**
 * 赛事详情页主视觉（RFC-018 P2 / RFC-020 视觉整改 §B）。
 *
 * 用 editorial.heroImage 作整幅背景，叠加赛事名（巨字 text-hero）/ tagline /
 * 状态·起止·报名数（TechLabel 仪表盘读数），并承载操作区（报名 / 提交参赛 / 排行榜）。
 * 操作区状态由「登录 + 报名 + 赛事状态」三者共同决定，按状态矩阵渲染（逻辑不变）。
 * framer-motion 克制入场 + 轻视差，useReducedMotion 守护；hero 图 eager 加载。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import type { Competition } from '@fwx/shared'
import { PillButton } from '../../../components/common/PillButton'
import { TechLabel } from '../../../components/common/TechLabel'
import { COMPETITION_STATUS_LABEL } from '../../../hooks/useCompetitions'

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
        <PillButton variant="primary" disabled>
          赛事已结束
        </PillButton>
      )
    }
    if (!isLoggedIn) {
      return (
        <PillButton variant="primary" arrow onClick={onRequireLogin}>
          登录后参加
        </PillButton>
      )
    }
    if (isRegistered) {
      return (
        <span className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-pill bg-accent-leaf/20 px-7 font-grotesk text-base font-medium text-white">
          <CheckCircle2 size={18} /> 已报名
        </span>
      )
    }
    return (
      <PillButton variant="primary" arrow onClick={onRegister} disabled={registering || !canAct}>
        {registering ? '报名中…' : '报名参加'}
      </PillButton>
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
    <section className="relative overflow-hidden rounded-card bg-ink-900 shadow-sky-glow">
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
        className="absolute inset-0 bg-gradient-to-t from-ink-900/92 via-ink-900/55 to-ink-900/20"
      />

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="relative flex min-h-[24rem] flex-col justify-end gap-10 p-6 md:min-h-[32rem] md:p-12 lg:flex-row lg:items-end lg:justify-between"
      >
        {/* 文案区 */}
        <div className="max-w-2xl">
          <h1 className="font-grotesk text-hero font-semibold leading-none text-white">{name}</h1>
          <p className="mt-5 max-w-[560px] text-body text-white/85">{tagline}</p>
          <TechLabel
            className="mt-8 text-white"
            items={[
              { k: '状态', v: COMPETITION_STATUS_LABEL[status] },
              {
                k: '赛程',
                v: `${new Date(startTime).toLocaleDateString()} — ${new Date(endTime).toLocaleDateString()}`,
              },
              { k: '报名', v: `${registeredCount} 人` },
            ]}
          />
        </div>

        {/* 操作区 */}
        <div className="flex w-full flex-col gap-3 sm:max-w-sm lg:w-auto lg:min-w-[16rem]">
          {renderPrimary()}
          <div className="flex flex-wrap gap-3">
            <PillButton
              variant="ghost"
              onClick={handleSubmitClick}
              disabled={submitDisabled}
              title={submitHint}
              className="flex-1 border-white/40 text-white hover:border-accent-spark hover:text-accent-spark"
            >
              提交参赛
            </PillButton>
            <PillButton
              variant="ghost"
              onClick={onLeaderboard}
              className="flex-1 border-white/40 text-white hover:border-accent-spark hover:text-accent-spark"
            >
              排行榜
            </PillButton>
          </div>
          {!isClosedOrDraft && submitHint && !isRegistered && (
            <p className="text-sm text-white/65">
              {submitHint === '请先报名' ? '报名后即可提交你的参赛作品' : submitHint}
            </p>
          )}
        </div>
      </motion.div>
    </section>
  )
}
