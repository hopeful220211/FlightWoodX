/**
 * 奖项设置区块（RFC-018 P2 富区块 · RFC-020 视觉整改）。
 *
 * 纯展示：awards.png 主视觉 + 金/银/铜三档（名额用 BigStat 大字做冲击）+
 * 特别奖（special）单列说明。金奖走点睛/质感高亮（小面积金色 ring/描边，不上大色块）。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { BigStat } from '../../../components/common/BigStat'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { SECTION_IDS, type AwardContent } from '../content/competitionContent'

const AWARDS_BANNER = '/competitions/awards.png'

/** 三档奖牌质感（小面积金色高亮 / 描边，不上大色块）。special 走单列样式，不在此表。 */
const TIER_STYLE: Record<
  Exclude<AwardContent['tier'], 'special'>,
  { ring: string; label: string }
> = {
  gold: { ring: 'ring-2 ring-accent-gold/60', label: 'text-accent-gold' },
  silver: { ring: 'ring-1 ring-ink-200', label: 'text-ink-600' },
  bronze: { ring: 'ring-1 ring-wood-300/60', label: 'text-wood-600' },
}

/** 把「1 名」「若干」拆成 BigStat 的 value + unit；纯数字优先放大。 */
function splitCount(count?: string): { value: string; unit?: string } {
  if (!count) return { value: '—' }
  const m = count.match(/^(\d+)\s*(.*)$/)
  if (m) return { value: m[1], unit: m[2] || undefined }
  return { value: count }
}

export function AwardsSection({ awards }: { awards: AwardContent[] }): JSX.Element {
  const reduce = useReducedMotion()

  const podium = awards.filter(
    (a): a is AwardContent & { tier: 'gold' | 'silver' | 'bronze' } =>
      a.tier !== 'special',
  )
  const specials = awards.filter((a) => a.tier === 'special')

  return (
    <section
      id={SECTION_IDS.awards}
      className="scroll-mt-24 bg-surface-ice py-20 md:py-24"
    >
      <div className="mb-16 md:mb-20">
        <SectionLabel>Awards</SectionLabel>
        <h2 className="mt-3 font-grotesk text-h2 font-bold text-ink-900">
          奖项设置
        </h2>
      </div>

      {/* 主视觉横幅 */}
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.98 }}
        whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="mb-16 overflow-hidden rounded-card shadow-soft md:mb-20"
      >
        <img
          src={AWARDS_BANNER}
          alt="奖项主视觉"
          loading="lazy"
          className="aspect-[21/9] w-full object-cover"
        />
      </motion.div>

      {/* 金/银/铜三档：名额用 BigStat 大字 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {podium.map((award, i) => {
          const s = TIER_STYLE[award.tier]
          const { value, unit } = splitCount(award.count)
          return (
            <motion.div
              key={award.tier}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: 'easeOut' }}
              className={`flex flex-col gap-6 rounded-card bg-surface-white p-8 shadow-soft ${s.ring}`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className={`font-grotesk text-title-sm font-bold ${s.label}`}>
                  {award.title}
                </h3>
              </div>
              <BigStat value={value} unit={unit} label="名额" />
              <p className="text-body text-ink-600">{award.detail}</p>
            </motion.div>
          )
        })}
      </div>

      {/* 特别奖：单列说明 */}
      {specials.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6">
          {specials.map((award) => (
            <motion.div
              key={award.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col gap-3 rounded-card bg-surface-white p-8 shadow-soft ring-1 ring-sky-100 sm:flex-row sm:items-center sm:justify-between sm:gap-8"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-grotesk text-title-sm font-bold text-accent-spark">
                    {award.title}
                  </h3>
                  {award.count && (
                    <span className="rounded-tag bg-accent-spark px-3 py-1 text-label uppercase text-white">
                      {award.count}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-body text-ink-600">{award.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
