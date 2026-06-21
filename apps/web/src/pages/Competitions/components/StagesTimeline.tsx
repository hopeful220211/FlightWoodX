/**
 * 赛段创作流程时间线（RFC-018 P2 富区块）。
 *
 * 纯展示：接 stages props 渲染「设计 → 编程 → 仿真试飞」三步流程。
 * 横向桌面（卡片排成一行 + 连接线），纵向移动端（卡片竖排 + 连接线）。
 * 不伪造每段日期，只表达创作先后顺序。
 */
import { motion, useReducedMotion } from 'framer-motion'
import { SECTION_IDS, type StageContent } from '../content/competitionContent'

export function StagesTimeline({ stages }: { stages: StageContent[] }): JSX.Element {
  const reduce = useReducedMotion()

  return (
    <section
      id={SECTION_IDS.stages}
      className="scroll-mt-24 py-12 md:py-16"
    >
      <div className="mb-8 md:mb-12">
        <p className="text-sm font-medium uppercase tracking-wider text-sky-500">
          Creative Flow
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 md:text-3xl">
          赛程赛段
        </h2>
        <p className="mt-2 max-w-2xl text-base text-ink-600">
          从设计到试飞，三步完成属于你的木质无人机作品。
        </p>
      </div>

      <ol className="relative flex flex-col gap-6 md:flex-row md:gap-4">
        {stages.map((stage, i) => (
          <li key={stage.key} className="relative flex-1">
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
              className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-sky-100"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-sky-50">
                <img
                  src={stage.image}
                  alt={stage.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 font-display text-base font-bold text-white shadow-sky-glow">
                  {stage.index}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-bold text-ink-900">
                  {stage.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {stage.summary}
                </p>
              </div>
            </motion.div>

            {/* 连接线/箭头：体现先后顺序，最后一段不画 */}
            {i < stages.length - 1 && (
              <>
                {/* 桌面：横向箭头 */}
                <span
                  aria-hidden
                  className="absolute right-0 top-[28%] hidden translate-x-1/2 text-sky-300 md:block"
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12h14m0 0-6-6m6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {/* 移动端：纵向箭头 */}
                <span
                  aria-hidden
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-sky-300 md:hidden"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 5v14m0 0 6-6m-6 6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
