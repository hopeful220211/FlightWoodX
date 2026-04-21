import { ScrollReveal } from '../../../components/common/ScrollReveal'

const stages = [
  { num: '01', title: '认识榫卯', lessons: '3 课时', desc: '传统工艺入门，理解结构基础' },
  { num: '02', title: '设计基础', lessons: '3 课时', desc: '进入设计工作台，学习飞行原理' },
  { num: '03', title: '制作实战', lessons: '3 课时', desc: '亲手拼装零件，完成组装' },
  { num: '04', title: '试飞调试', lessons: '3 课时', desc: '见证起飞，学会分析与迭代' },
]

export function CurriculumSection() {
  return (
    <section className="bg-paper-100 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-[52px] font-semibold text-ink-900 leading-tight">
            12 课时 · 从想到做到飞
          </h2>
          <p className="font-display mt-4 text-xl text-ink-600">
            系统设计的完整学习路径
          </p>
        </ScrollReveal>

        {/* Horizontal timeline */}
        <div className="relative">
          {/* Timeline line — desktop only */}
          <div className="hidden lg:block absolute top-[28px] left-[12.5%] right-[12.5%] h-[2px] bg-wood-200">
            <div
              className="h-full bg-wood-500 transition-all duration-1000"
              style={{ width: '100%' }}
            />
          </div>

          {/* Stages */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stages.map((stage, i) => (
              <ScrollReveal key={stage.num} delay={i * 120}>
                <div className="relative flex flex-col items-center text-center">
                  {/* Timeline dot */}
                  <div className="hidden lg:flex w-14 h-14 rounded-full bg-wood-500 text-white items-center justify-center text-sm font-semibold mb-6 relative z-10">
                    {stage.num}
                  </div>

                  {/* Card */}
                  <div className="w-full bg-paper-50 rounded-md p-6">
                    {/* Large watermark number */}
                    <div
                      className="text-[48px] font-semibold leading-none lg:hidden"
                      style={{ color: 'rgba(166, 112, 56, 0.15)' }}
                    >
                      {stage.num}
                    </div>
                    <h3 className="font-display text-[22px] font-semibold text-ink-900 mt-1">
                      {stage.title}
                    </h3>
                    <span className="inline-block mt-2 px-3 py-1 text-xs font-medium rounded-full bg-wood-100 text-wood-600">
                      {stage.lessons}
                    </span>
                    <p className="mt-3 text-sm text-ink-600 leading-relaxed">
                      {stage.desc}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Download CTA */}
        <ScrollReveal delay={500} className="mt-12 text-center">
          <button
            disabled
            className="inline-flex items-center gap-2 text-sm font-medium text-ink-400 cursor-not-allowed"
          >
            下载完整教案 PDF（即将开放）
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}
