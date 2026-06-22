/**
 * 赛段创作流程时间线（RFC-018 P2 富区块 · RFC-020 视觉整改）。
 *
 * 纯展示：接 stages props 渲染「设计 → 编程 → 仿真试飞」三步流程。
 * RFC-020 改法：每段做不对称双栏（文 col-span-5 + 图 col-span-7），
 * 左右方向交替，段间狠留白；配图用 HoverReveal 方图。不伪造每段日期。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { HoverReveal } from '../../../components/common/HoverReveal'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { SECTION_IDS, type StageContent } from '../content/competitionContent'

const STAGE_ENGLISH = ['Design', 'Program', 'Simulate']

export function StagesTimeline({ stages }: { stages: StageContent[] }): JSX.Element {
  const reduce = useReducedMotion()

  return (
    <section
      id={SECTION_IDS.stages}
      className="scroll-mt-24 py-20 md:py-24"
    >
      <div className="mb-16 md:mb-20">
        <SectionLabel>Creative Flow</SectionLabel>
        <h2 className="mt-3 font-grotesk text-h2 font-bold text-ink-900">
          赛程赛段
        </h2>
        <p className="mt-4 max-w-[560px] text-body text-ink-600">
          从设计到试飞，三步完成属于你的木质无人机作品。
        </p>
      </div>

      <ol className="space-y-20 md:space-y-24">
        {stages.map((stage, i) => {
          const reversed = i % 2 === 1
          return (
            <motion.li
              key={stage.key}
              initial={reduce ? false : { opacity: 0, y: 28 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16"
            >
              {/* 文案：col-span-5 */}
              <div
                className={`flex flex-col lg:col-span-5 ${
                  reversed ? 'lg:order-2 lg:col-start-8' : 'lg:order-1'
                }`}
              >
                <SectionLabel>
                  {`0${stage.index} · ${STAGE_ENGLISH[i] ?? ''}`}
                </SectionLabel>
                <h3 className="mt-3 font-grotesk text-h3 font-bold text-ink-900">
                  {stage.title}
                </h3>
                <p className="mt-4 max-w-[560px] text-body text-ink-600">
                  {stage.summary}
                </p>
              </div>

              {/* 配图：col-span-7 方图 + 悬停揭示 */}
              <div
                className={`lg:col-span-7 ${
                  reversed ? 'lg:order-1 lg:col-start-1' : 'lg:order-2'
                }`}
              >
                <HoverReveal
                  image={stage.image}
                  alt={stage.title}
                  className="aspect-[4/3] w-full shadow-soft"
                />
              </div>
            </motion.li>
          )
        })}
      </ol>
    </section>
  )
}
