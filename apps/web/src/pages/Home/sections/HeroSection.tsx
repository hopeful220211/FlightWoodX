import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Play, Trophy, Users, Puzzle, ChevronDown } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { VideoModal } from '../../../components/common/VideoModal'
import { AwardCapsule } from './hero/AwardCapsule'
import { HeroDrone3D } from './hero/HeroDrone3D'

const demoVideoUrl = '/resource/videos/example.mp4'

function AnimatedEntry({ children, delay = 0, className = '' }: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        opacity: 0,
        animation: `fadeInUp 600ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms forwards`,
      }}
    >
      {children}
    </div>
  )
}

export function HeroSection() {
  const navigate = useNavigate()
  const [showVideoModal, setShowVideoModal] = useState(false)

  const scrollToAwards = () => {
    document.getElementById('awards')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <section className="relative min-h-screen bg-paper-50 overflow-x-clip">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[calc(100vh-72px)] items-center gap-12 pt-[72px] pb-16 lg:grid-cols-[55%_45%] lg:gap-8">

            {/* Left column */}
            <div className="z-10 space-y-6">

              {/* Award capsule */}
              <AwardCapsule onClick={scrollToAwards} delay={0} />

              {/* Main title */}
              <div className="space-y-1">
                <AnimatedEntry delay={120}>
                  <h1
                    className="font-bold leading-[0.95] text-ink-900"
                    style={{ fontSize: 'clamp(72px, 10vw, 140px)' }}
                  >
                    FLIGHT
                  </h1>
                </AnimatedEntry>
                <AnimatedEntry delay={220}>
                  <h1
                    className="font-bold leading-[0.95] text-wood-500"
                    style={{ fontSize: 'clamp(72px, 10vw, 140px)' }}
                  >
                    WOOD X
                  </h1>
                </AnimatedEntry>
              </div>

              {/* Chinese subtitle */}
              <AnimatedEntry delay={400}>
                <p className="font-display text-[clamp(28px,4vw,40px)] font-medium text-ink-900">
                  动手造，会飞的。
                </p>
              </AnimatedEntry>

              {/* Description */}
              <AnimatedEntry delay={520}>
                <p className="max-w-lg text-[17px] leading-relaxed text-ink-600">
                  从传统榫卯工艺出发，抵达现代飞行器。
                  <br />
                  全球首个面向青少年的木质无人机 STEAM 教育系统。
                </p>
              </AnimatedEntry>

              {/* CTA buttons */}
              <AnimatedEntry delay={640} className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => navigate('/design')}
                  rightIcon={<ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                  className="group bg-wood-500 hover:brightness-[0.92] text-white px-8"
                >
                  开始设计
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setShowVideoModal(true)}
                  leftIcon={<Play size={18} />}
                  className="border-ink-200 text-ink-900 hover:bg-paper-100 px-8"
                >
                  观看视频
                </Button>
              </AnimatedEntry>

              {/* Real achievement metrics */}
              <AnimatedEntry delay={800}>
                <div className="grid grid-cols-3 gap-6 pt-4">
                  <div className="flex items-start gap-3">
                    <Trophy size={20} className="mt-0.5 text-accent-gold shrink-0" />
                    <div>
                      <div className="font-display text-2xl font-semibold text-ink-900">4 项</div>
                      <div className="text-sm text-ink-400">国际设计奖</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users size={20} className="mt-0.5 text-ink-400 shrink-0" />
                    <div>
                      <div className="font-display text-2xl font-semibold text-ink-900">6 人</div>
                      <div className="text-sm text-ink-400">跨学科团队</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Puzzle size={20} className="mt-0.5 text-ink-400 shrink-0" />
                    <div>
                      <div className="font-display text-2xl font-semibold text-ink-900">77 个</div>
                      <div className="text-sm text-ink-400">标准化零件</div>
                    </div>
                  </div>
                </div>
              </AnimatedEntry>
            </div>

            {/* Right column: drone images */}
            <AnimatedEntry delay={300} className="relative flex items-center justify-center max-w-[400px] mx-auto lg:max-w-none lg:mx-0 lg:h-[500px]">
              <HeroDrone3D />
            </AnimatedEntry>
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-ink-400"
          style={{
            opacity: 0,
            animation: 'fadeInUp 500ms cubic-bezier(0.2, 0.8, 0.2, 1) 900ms forwards',
          }}
        >
          <span className="text-xs">向下滚动</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      <VideoModal
        open={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        videoUrl={demoVideoUrl}
        title="FlightWoodX 产品演示"
      />
    </>
  )
}
