import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { LANDING_HERO } from '../content/competitionContent'
import { SectionLabel } from '../../../components/common/SectionLabel'

/**
 * 赛事中心顶部 hero 横幅（RFC-018 P2 · RFC-020 A 节视觉整改）。
 * 主视觉用 LANDING_HERO，压上 text-hero 巨字标题 + 口号；暗色渐变蒙版保证白字可读。
 * framer-motion 做克制入场 + 轻微鼠标视差，prefers-reduced-motion 时关闭视差与大幅动效。
 */
export function CompetitionHero() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const px = (e.clientX - rect.left) / rect.width - 0.5
      const py = (e.clientY - rect.top) / rect.height - 0.5
      setParallax({ x: px, y: py })
    }
    const onLeave = () => setParallax({ x: 0, y: 0 })
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    return () => {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
    }
  }, [reduce])

  const ease = [0.2, 0.8, 0.2, 1] as const

  return (
    <section
      ref={ref}
      className="relative overflow-hidden rounded-card border border-sky-100/60 bg-sky-hero shadow-sky-glow"
    >
      {/* 背景主视觉（轻微视差放大，防止边缘露白） */}
      <motion.img
        src={LANDING_HERO}
        alt=""
        aria-hidden
        loading="eager"
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover"
        animate={reduce ? undefined : { x: parallax.x * 24, y: parallax.y * 18 }}
        transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.6 }}
      />
      {/* 暗色渐变蒙版：保证巨字白字 AA 可读 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-sky-950/80 via-sky-900/45 to-sky-900/10"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-r from-sky-950/55 to-transparent"
      />

      <div className="relative px-6 py-20 sm:px-12 sm:py-28 lg:px-16 lg:py-36">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="max-w-3xl"
        >
          <SectionLabel className="text-accent-spark">
            FlightWoodX · Competitions
          </SectionLabel>

          {/* 巨字标题：text-hero 1:1 行高，压在配图上 */}
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.08 }}
            className="mt-5 font-grotesk text-hero font-bold text-white drop-shadow-sm"
          >
            赛事中心
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.16 }}
            className="mt-6 max-w-[560px] text-body text-white/90"
          >
            设计、编程、仿真试飞，飞向你的木质无人机梦想。仿真先行，无需硬件，一台电脑就能参赛。
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.24 }}
            className="mt-8 inline-flex items-center gap-2 font-grotesk text-label uppercase text-white/80"
          >
            <span className="h-px w-8 bg-accent-spark" aria-hidden />
            往下看，选一个赛事开始你的创作
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
