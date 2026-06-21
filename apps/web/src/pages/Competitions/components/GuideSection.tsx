/**
 * 参赛指南区块（RFC-018 P2 富区块）。
 *
 * 纯展示：报名 → 设计 → 编程 → 仿真 → 提交 的编号步骤流。
 * 受众是中小学生，文案大、序号清晰、左侧贯穿连接线表达顺序。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { SECTION_IDS, type GuideStep } from '../content/competitionContent'

export function GuideSection({ guide }: { guide: GuideStep[] }): JSX.Element {
  const reduce = useReducedMotion()

  return (
    <section id={SECTION_IDS.guide} className="scroll-mt-24 py-12 md:py-16">
      <div className="mb-8 md:mb-12">
        <p className="text-sm font-medium uppercase tracking-wider text-sky-500">
          How To Join
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 md:text-3xl">
          参赛指南
        </h2>
        <p className="mt-2 max-w-2xl text-base text-ink-600">
          跟着这五步走，就能完成你的第一次参赛。
        </p>
      </div>

      <ol className="relative ml-2">
        {/* 贯穿连接线 */}
        <span
          aria-hidden
          className="absolute left-[1.125rem] top-2 bottom-2 w-px bg-sky-100"
        />
        {guide.map((step, i) => (
          <motion.li
            key={step.index}
            initial={reduce ? false : { opacity: 0, x: -16 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
            className="relative flex gap-4 pb-7 last:pb-0"
          >
            <span className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-500 font-display text-base font-bold text-white shadow-sky-glow">
              {step.index}
            </span>
            <div className="pt-1">
              <h3 className="font-display text-lg font-bold text-ink-900">
                {step.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                {step.detail}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
