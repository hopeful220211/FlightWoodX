import { useNavigate } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'
import { SectionHeading } from '../components/SectionHeading'
import { useAuthStore } from '../../../stores/authStore'

export function FinalCTASection() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <section className="relative bg-sky-900 py-24 lg:py-32 overflow-hidden">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-800/50 to-sky-950/80" />

      <div className="relative mx-auto max-w-4xl px-4">
        <ScrollReveal>
          <SectionHeading
            tone="light"
            eyebrow="开始动手"
            title={<>想自己造一架<br />会飞的无人机吗？</>}
            lead="设计、搭建、导出、分享，全在这一个平台里。"
          />
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(isAuthenticated ? '/design' : '/auth')}
            className="group inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-white px-8 py-4 text-base font-semibold text-sky-700 shadow-sky-glow transition-all hover:bg-sky-50"
          >
            免费开始设计
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/auth?type=school')}
            className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-xl border border-white/20 px-8 py-4 text-base font-medium text-sky-200 transition-colors hover:bg-white/10"
          >
            联系我们
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}
