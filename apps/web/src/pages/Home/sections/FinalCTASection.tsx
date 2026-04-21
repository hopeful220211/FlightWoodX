import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'
import { useAuthStore } from '../../../stores/authStore'

export function FinalCTASection() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <section className="relative bg-ink-900 py-24 lg:py-32 overflow-hidden">
      {/* Subtle wood texture overlay */}
      <div className="absolute inset-0 opacity-[0.04] bg-[url('/resource/picture/flight_png/untitled.160.png')] bg-cover bg-center" />

      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <ScrollReveal>
          <h2 className="font-display text-4xl lg:text-[60px] font-semibold text-paper-50 leading-tight">
            准备好开启你的
            <br />
            创造之旅了吗？
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <p className="mt-4 text-xl text-wood-400">
            从设计到飞行，从想法到起飞
          </p>
        </ScrollReveal>

        <ScrollReveal delay={200} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(isAuthenticated ? '/design' : '/auth')}
            className="group inline-flex items-center gap-2 rounded-md bg-wood-500 px-8 py-4 text-base font-medium text-white transition-all hover:brightness-[0.92]"
          >
            免费开始设计
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate('/auth?type=school')}
            className="inline-flex items-center gap-2 rounded-md border border-paper-50/30 px-8 py-4 text-base font-medium text-paper-50 transition-colors hover:bg-white/10"
          >
            联系我们
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}
