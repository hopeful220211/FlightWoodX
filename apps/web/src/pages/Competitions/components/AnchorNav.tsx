/**
 * 赛事详情页锚点导航条（RFC-018 P2 / RFC-011 §4 赛事站）。
 *
 * sticky 在页面顶部，链各富区块（介绍 / 赛段 / 奖项 / 指南 / 排行榜）。
 * 点击平滑滚动到对应 SECTION_IDS（scrollIntoView，reduced-motion 时不平滑）。
 * 当前 section 用 IntersectionObserver 高亮；移动端可横向滚动。
 */
import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { SectionLabel } from '../../../components/common/SectionLabel'
import { SECTION_IDS, type SectionId } from '../content/competitionContent'

interface NavItem {
  id: SectionId
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { id: SECTION_IDS.intro, label: '赛事介绍' },
  { id: SECTION_IDS.stages, label: '赛程赛段' },
  { id: SECTION_IDS.awards, label: '奖项设置' },
  { id: SECTION_IDS.guide, label: '参赛指南' },
  { id: SECTION_IDS.leaderboard, label: '排行榜·获奖' },
]

export function AnchorNav(): JSX.Element {
  const reduce = useReducedMotion()
  const [active, setActive] = useState<SectionId>(SECTION_IDS.intro)
  /** 记录各 section 的可见比例，取最大者为 active，避免短区块抢焦点。 */
  const ratios = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    const sections = NAV_ITEMS.map((it) => document.getElementById(it.id)).filter(
      (el): el is HTMLElement => el != null,
    )
    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.current.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }
        let best: SectionId = active
        let bestRatio = -1
        for (const it of NAV_ITEMS) {
          const r = ratios.current.get(it.id) ?? 0
          if (r > bestRatio) {
            bestRatio = r
            best = it.id
          }
        }
        if (bestRatio > 0) setActive(best)
      },
      {
        // 顶部留出 sticky 条 + 间距的高度，下方略放宽
        rootMargin: '-96px 0px -55% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    )

    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
    // active 仅作初值参考，section 集合固定，无需重订阅
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: SectionId): void {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    setActive(id)
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <nav
      aria-label="赛事区块导航"
      className="sticky top-16 z-30 -mx-4 border-b border-sky-100 bg-surface-white/85 px-4 backdrop-blur lg:-mx-6 lg:px-6"
    >
      <ul className="flex gap-7 overflow-x-auto py-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map((it) => {
          const isActive = active === it.id
          return (
            <li key={it.id} className="shrink-0">
              <a
                href={`#${it.id}`}
                onClick={(e) => handleClick(e, it.id)}
                aria-current={isActive ? 'true' : undefined}
                className="inline-flex items-center transition-colors"
              >
                <SectionLabel
                  className={
                    isActive
                      ? 'text-accent-spark'
                      : 'text-ink-400 hover:text-ink-700'
                  }
                >
                  {it.label}
                </SectionLabel>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
