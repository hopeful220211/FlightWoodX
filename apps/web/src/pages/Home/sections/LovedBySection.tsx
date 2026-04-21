import { ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'

export function LovedBySection() {
  return (
    <section className="bg-paper-100 py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-4">
        <ScrollReveal className="text-center">
          <p className="text-sm font-medium tracking-wider text-ink-400 uppercase mb-4">
            Loved by educators & students
          </p>
          <h2 className="text-4xl lg:text-[52px] font-semibold text-ink-900 leading-tight">
            来自一线老师和学生的声音
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-12">
          <div className="bg-paper-50 border border-ink-200/50 rounded-lg p-10 text-center">
            <p className="text-lg text-ink-600 leading-relaxed">
              我们的首批试点学校将在 2026 年秋季学期启动。
              <br />
              届时这里将展示真实的使用反馈。
            </p>
            <button
              type="button"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-wood-500 hover:text-wood-600 transition-colors"
            >
              成为首批合作学校
              <ArrowRight size={14} />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
