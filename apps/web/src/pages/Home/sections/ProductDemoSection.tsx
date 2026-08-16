import { useNavigate } from 'react-router'
import { Layers, Puzzle, Eye, ShieldCheck, ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'
import { SectionHeading } from '../components/SectionHeading'
import { Button } from '../../../components/common/Button'
import { useAuthStore } from '../../../stores/authStore'

const features = [
  { icon: Layers, text: '5 步引导式搭建' },
  { icon: Puzzle, text: '77 种木质零件' },
  { icon: Eye, text: '3D 实时预览' },
  { icon: ShieldCheck, text: '起飞检查 · 一键导出' },
]

export function ProductDemoSection() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <section className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid gap-12 lg:grid-cols-[60%_40%] items-center">

          {/* Left: screenshot */}
          <ScrollReveal direction="left" distance={30}>
            <div
              className="rounded-2xl overflow-hidden shadow-[0_30px_70px_rgba(23,74,126,0.22)] ring-1 ring-sky-100/70"
              style={{ transform: 'perspective(1400px) rotateY(-3deg) rotateX(1deg)' }}
            >
              <img
                src="/resource/picture/UI/design_ui.jpg"
                alt="FlightWoodX 设计工作台"
                className="w-full h-auto"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `data:image/svg+xml;utf8,${encodeURIComponent(
                    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="100%" height="100%" fill="#F3EFE8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="20" fill="#5C5C5C">设计工作台截屏</text></svg>'
                  )}`
                }}
              />
            </div>
          </ScrollReveal>

          {/* Right: text */}
          <ScrollReveal direction="right" distance={20} delay={100}>
            <div className="space-y-6">
              <SectionHeading
                align="left"
                eyebrow="真实界面"
                title={<>你看到的，<br />是孩子看到的</>}
                lead="没放修过的宣传图，这就是学生每天打开的那个界面。"
              />

              <ul className="space-y-3">
                {features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sky-800">
                    <f.icon size={18} className="text-sky-500 shrink-0" />
                    <span className="text-base">{f.text}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate(isAuthenticated ? '/design' : '/auth')}
                rightIcon={<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                className="group mt-2"
              >
                立即体验
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
