import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Trophy, Users, Calendar, ArrowRight, Crown, MapPin } from 'lucide-react'
import { editorialFor } from '../content/competitionContent'
import {
  COMPETITION_STATUS_LABEL,
  COMPETITION_STATUS_CLASS,
  type CompetitionView,
} from '../../../hooks/useCompetitions'

/** ISO 起止 → "2026年7月 — 2026年8月" */
function dateRange(start: string, end: string): string {
  const fmt = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }
  return `${fmt(start)} — ${fmt(end)}`
}

function StatusBadge({ status }: { status: CompetitionView['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${COMPETITION_STATUS_CLASS[status]}`}
    >
      {COMPETITION_STATUS_LABEL[status]}
    </span>
  )
}

const EASE = [0.2, 0.8, 0.2, 1] as const

/**
 * 年度旗舰赛事大卡：横向大尺寸，annual-2026-cover 封面 + 名称 + 状态 + 报名数 + tagline。
 */
export function FlagshipCard({ comp }: { comp: CompetitionView }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const editorial = editorialFor(comp)

  return (
    <motion.button
      type="button"
      onClick={() => nav(`/competitions/${comp.id}`)}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group block w-full overflow-hidden rounded-2xl border border-sky-100/70 bg-white text-left shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="grid md:grid-cols-2">
        {/* 封面 */}
        <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[20rem]">
          <img
            src={editorial.heroImage}
            alt={comp.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-accent-gold px-3 py-1 text-xs font-bold text-white shadow-sm">
            <Crown size={14} />
            年度旗舰赛事
          </span>
        </div>

        {/* 内容 */}
        <div className="flex flex-col justify-center gap-4 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600">
              <Trophy size={16} className="text-accent-gold" />
              翼创未来
            </span>
            <StatusBadge status={comp.status} />
          </div>

          <h2 className="font-display text-2xl font-bold leading-snug text-ink-900 sm:text-3xl">
            {comp.name}
          </h2>

          <p className="text-base leading-relaxed text-ink-600">{editorial.tagline}</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} />
              {dateRange(comp.startTime, comp.endTime)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} />
              {comp.registeredCount} 人报名
            </span>
          </div>

          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition-colors group-hover:text-sky-700">
            查看赛事详情
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </motion.button>
  )
}

/**
 * 区域赛事卡：稍小，regional-cover 封面。
 */
export function RegionalCard({ comp }: { comp: CompetitionView }) {
  const nav = useNavigate()
  const reduce = useReducedMotion()
  const editorial = editorialFor(comp)

  return (
    <motion.button
      type="button"
      onClick={() => nav(`/competitions/${comp.id}`)}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4 }}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-sky-100/70 bg-white text-left shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={editorial.heroImage}
          alt={comp.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-wood-500/90 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
          <MapPin size={13} />
          区域赛事
        </span>
        <span className="absolute right-3 top-3">
          <StatusBadge status={comp.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
        <h3 className="font-display text-xl font-bold leading-snug text-ink-900">{comp.name}</h3>
        <p className="flex-1 text-sm leading-relaxed text-ink-600">{editorial.tagline}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-400">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} />
            {dateRange(comp.startTime, comp.endTime)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} />
            {comp.registeredCount} 人报名
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-sky-600 transition-colors group-hover:text-sky-700">
          查看详情
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </motion.button>
  )
}
