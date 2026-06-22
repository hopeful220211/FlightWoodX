/**
 * 参赛指南区块（RFC-018 P2 富区块 · RFC-020 视觉整改）。
 *
 * 纯展示：报名 → 设计 → 编程 → 仿真 → 提交 的编号步骤流。
 * RFC-020 改法：编号用点睛蓝圆（accent-spark），步骤名 text-title-sm，
 * 正文 text-body，留白拉开成清晰流程。左侧贯穿连接线表达顺序。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { SECTION_IDS, type GuideStep } from '../content/competitionContent'

export function GuideSection({ guide }: { guide: GuideStep[] }): JSX.Element {
  const reduce = useReducedMotion()

  return (
    <section id={SECTION_IDS.guide} className="scroll-mt-24 py-20 md:py-24">
      <div className="mb-16 md:mb-20">
        <SectionLabel>How To Join</SectionLabel>
        <h2 className="mt-3 font-grotesk text-h2 font-bold text-ink-900">
          参赛指南
        </h2>
        <p className="mt-4 max-w-[560px] text-body text-ink-600">
          跟着这五步走，就能完成你的第一次参赛。
        </p>
      </div>

      <ol className="relative ml-2">
        {/* 贯穿连接线 */}
        <span
          aria-hidden
          className="absolute left-6 top-3 bottom-3 w-px bg-sky-100"
        />
        {guide.map((step, i) => (
          <motion.li
            key={step.index}
            initial={reduce ? false : { opacity: 0, x: -16 }}
            whileInView={reduce ? undefined : { opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: 'easeOut' }}
            className="relative flex gap-6 pb-12 last:pb-0"
          >
            <span className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-spark font-grotesk text-title-sm font-bold text-white shadow-sky-glow">
              {step.index}
            </span>
            <div className="pt-1.5">
              <h3 className="font-grotesk text-title-sm font-bold text-ink-900">
                {step.title}
              </h3>
              <p className="mt-2 max-w-[560px] text-body text-ink-600">
                {step.detail}
              </p>
            </div>
          </motion.li>
        ))}
      </ol>
    </section>
  )
}
