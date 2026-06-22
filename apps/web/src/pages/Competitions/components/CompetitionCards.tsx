import { motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Calendar, Crown, MapPin } from 'lucide-react'
import { editorialFor } from '../content/competitionContent'
import { HoverReveal } from '../../../components/common/HoverReveal'
import { BigStat } from '../../../components/common/BigStat'
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
      className={`inline-flex items-center rounded-tag px-3 py-1 text-label uppercase ${COMPETITION_STATUS_CLASS[status]}`}
    >
      {COMPETITION_STATUS_LABEL[status]}
    </span>
  )
}

const EASE = [0.2, 0.8, 0.2, 1] as const

/**
 * 年度旗舰赛事大卡（RFC-020 A 节）：不对称 5fr/7fr 左文右图。
 * 文案 col-span-5、配图 col-span-7（HoverReveal）；rounded-card、留白足、shadow-sky-glow。
 * 报名数用 BigStat 大数据；标题 text-h3、正文 text-body。
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
      className="group block w-full overflow-hidden rounded-card border border-sky-100/70 bg-surface-white text-left shadow-sky-glow transition-shadow hover:shadow-lift"
    >
      <div className="grid items-stretch lg:grid-cols-12">
        {/* 文案区 5fr */}
        <div className="flex flex-col justify-center gap-5 p-8 sm:p-10 lg:col-span-5 lg:p-12">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-tag bg-accent-spark px-2.5 py-1 font-grotesk text-label uppercase text-white">
              <Crown size={13} />
              Flagship
            </span>
            <StatusBadge status={comp.status} />
          </div>

          <h2 className="font-grotesk text-h3 font-bold leading-snug text-ink-900">
            {comp.name}
          </h2>

          <p className="max-w-[560px] text-body text-ink-600">{editorial.tagline}</p>

          <div className="flex items-end gap-8 pt-1">
            <BigStat value={comp.registeredCount} unit="人" label="累计报名" />
            <div className="flex flex-col gap-2 pb-1">
              <span className="inline-flex items-center gap-1.5 text-sm text-ink-500">
                <Calendar size={15} />
                {dateRange(comp.startTime, comp.endTime)}
              </span>
              <span className="font-grotesk text-label uppercase text-accent-spark">
                查看赛事详情 →
              </span>
            </div>
          </div>
        </div>

        {/* 配图区 7fr */}
        <div className="lg:col-span-7">
          <HoverReveal
            image={editorial.heroImage}
            alt={comp.name}
            className="aspect-[16/10] h-full w-full rounded-none lg:aspect-auto lg:min-h-[22rem]"
          />
        </div>
      </div>
    </motion.button>
  )
}

/**
 * 区域赛事次卡（RFC-020）：更紧凑，regional-cover 封面 + 标题 + 报名数。
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
      className="group flex h-full w-full flex-col overflow-hidden rounded-card border border-sky-100/70 bg-surface-white text-left shadow-soft transition-shadow hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={editorial.heroImage}
          alt={comp.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-tag bg-wood-500/90 px-2.5 py-1 font-grotesk text-label uppercase text-white shadow-sm">
          <MapPin size={13} />
          Regional
        </span>
        <span className="absolute right-3 top-3">
          <StatusBadge status={comp.status} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
        <h3 className="font-grotesk text-title-sm font-bold leading-snug text-ink-900">
          {comp.name}
        </h3>
        <p className="flex-1 text-body text-ink-600">{editorial.tagline}</p>

        <div className="flex items-center justify-between pt-1">
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-500">
            <Calendar size={14} />
            {dateRange(comp.startTime, comp.endTime)}
          </span>
          <span className="font-grotesk text-sm text-ink-500">
            <span className="font-semibold text-accent-spark">{comp.registeredCount}</span> 人报名
          </span>
        </div>

        <span className="font-grotesk text-label uppercase text-accent-spark">
          查看详情 →
        </span>
      </div>
    </motion.button>
  )
}
