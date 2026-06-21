/**
 * 奖项设置区块（RFC-018 P2 富区块）。
 *
 * 纯展示：顶部 awards.png 主视觉横幅 + 金/银/铜三档奖项卡（色调区分）+
 * 特别奖（special）单列说明。各卡显示 title / detail / count。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { SECTION_IDS, type AwardContent } from '../content/competitionContent'

const AWARDS_BANNER = '/competitions/awards.png'

/** 三档奖牌色调（金=accent-gold、银=灰、铜=wood）。special 走单列样式，不在此表。 */
const TIER_STYLE: Record<
  AwardContent['tier'],
  { ring: string; badge: string; label: string }
> = {
  gold: {
    ring: 'ring-accent-gold/40',
    badge: 'bg-accent-gold text-white',
    label: 'text-accent-gold',
  },
  silver: {
    ring: 'ring-ink-200',
    badge: 'bg-ink-400 text-white',
    label: 'text-ink-600',
  },
  bronze: {
    ring: 'ring-wood-300/60',
    badge: 'bg-wood-500 text-white',
    label: 'text-wood-600',
  },
  special: {
    ring: 'ring-sky-200',
    badge: 'bg-sky-500 text-white',
    label: 'text-sky-600',
  },
}

export function AwardsSection({ awards }: { awards: AwardContent[] }): JSX.Element {
  const reduce = useReducedMotion()

  const podium = awards.filter((a) => a.tier !== 'special')
  const specials = awards.filter((a) => a.tier === 'special')

  return (
    <section id={SECTION_IDS.awards} className="scroll-mt-24 py-12 md:py-16">
      <div className="mb-8 md:mb-12">
        <p className="text-sm font-medium uppercase tracking-wider text-accent-gold">
          Awards
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 md:text-3xl">
          奖项设置
        </h2>
      </div>

      {/* 主视觉横幅 */}
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-8 overflow-hidden rounded-2xl shadow-soft ring-1 ring-wood-100"
      >
        <img
          src={AWARDS_BANNER}
          alt="奖项主视觉"
          loading="lazy"
          className="aspect-[21/9] w-full object-cover"
        />
      </motion.div>

      {/* 金/银/铜三档 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {podium.map((award, i) => {
          const s = TIER_STYLE[award.tier]
          return (
            <motion.div
              key={award.tier}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className={`flex flex-col rounded-2xl bg-white p-6 shadow-soft ring-1 ${s.ring}`}
            >
              <div className="flex items-center justify-between">
                <h3 className={`font-display text-xl font-bold ${s.label}`}>
                  {award.title}
                </h3>
                {award.count && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${s.badge}`}
                  >
                    {award.count}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-600">
                {award.detail}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* 特别奖：单列说明 */}
      {specials.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4">
          {specials.map((award) => {
            const s = TIER_STYLE.special
            return (
              <motion.div
                key={award.title}
                initial={reduce ? false : { opacity: 0, y: 20 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`flex flex-col gap-2 rounded-2xl bg-sky-50 p-6 ring-1 ${s.ring} sm:flex-row sm:items-center sm:justify-between`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className={`font-display text-lg font-bold ${s.label}`}>
                      {award.title}
                    </h3>
                    {award.count && (
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${s.badge}`}
                      >
                        {award.count}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {award.detail}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </section>
  )
}
