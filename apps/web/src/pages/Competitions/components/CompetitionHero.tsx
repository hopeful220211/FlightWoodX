import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles, Rocket } from 'lucide-react'
import { LANDING_HERO } from '../content/competitionContent'

/**
 * 赛事中心顶部 hero 横幅（RFC-018 P2）。
 * 主视觉用 LANDING_HERO，叠加大标题 + 口号；framer-motion 做克制入场 +
 * 轻微鼠标视差，prefers-reduced-motion 时关闭视差与大幅动效。
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
      className="relative overflow-hidden rounded-2xl border border-sky-100/60 bg-sky-hero shadow-soft"
    >
      {/* 背景主视觉（轻微视差放大，防止边缘露白） */}
      <motion.img
        src={LANDING_HERO}
        alt=""
        aria-hidden
        loading="eager"
        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-90"
        animate={reduce ? undefined : { x: parallax.x * 24, y: parallax.y * 18 }}
        transition={{ type: 'spring', stiffness: 60, damping: 20, mass: 0.6 }}
      />
      {/* 渐变压暗，保证文字可读 */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-sky-900/70 via-sky-800/30 to-transparent"
      />

      <div className="relative px-6 py-16 sm:px-10 sm:py-20 lg:px-14 lg:py-28">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="max-w-2xl"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm ring-1 ring-white/25">
            <Sparkles size={14} className="text-accent-gold" />
            翼创未来 · 木质无人机创意赛事
          </span>

          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.08 }}
            className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl lg:text-6xl"
          >
            赛事中心
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.16 }}
            className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg"
          >
            设计、编程、仿真试飞，飞向你的木质无人机梦想。仿真先行，无需硬件，一台电脑就能参赛。
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.24 }}
            className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-white/85"
          >
            <Rocket size={16} className="text-white" />
            往下看，选一个赛事开始你的创作
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
