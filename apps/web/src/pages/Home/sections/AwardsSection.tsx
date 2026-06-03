import { Trophy } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'

const awards = [
  {
    name: 'Red Dot',
    subtitle: 'Best of the Best',
    year: '2024',
    img: '/resource/picture/awards/red-dot-logo.31372310.png',
  },
  {
    name: 'iF Design',
    subtitle: 'Award',
    year: '2026',
    img: '/resource/picture/awards/if.png',
  },
  {
    name: 'IDEA',
    subtitle: 'Award',
    year: '2025',
    img: '/resource/picture/awards/IDEA.png',
  },
  {
    name: 'G-Mark',
    subtitle: 'Award',
    year: '2025',
    img: '/resource/picture/awards/gmark.png',
  },
]

function AwardBadge({ award, delay }: { award: typeof awards[number]; delay: number }) {
  return (
    <ScrollReveal delay={delay} className="flex flex-col items-center text-center">
      <div className="group relative w-[200px] h-[200px] lg:w-[240px] lg:h-[240px] flex items-center justify-center rounded-xl bg-sky-50/50 border border-sky-100 transition-all duration-300 hover:shadow-sky-glow hover:scale-[1.03]">
        <img
          src={award.img}
          alt={award.name}
          className="max-h-[120px] max-w-[120px] lg:max-h-[140px] lg:max-w-[140px] object-contain"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            const parent = target.parentElement
            if (parent) {
              const fallback = document.createElement('div')
              fallback.className = 'flex flex-col items-center gap-2'
              fallback.innerHTML = `<span class="text-accent-gold">${'★'}</span><span class="text-ink-900 font-semibold text-lg">${award.name}</span>`
              parent.appendChild(fallback)
            }
          }}
        />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-ink-900">{award.name}</h3>
      <p className="text-sm text-ink-600">{award.subtitle}</p>
      <p className="text-sm text-ink-400">{award.year}</p>
    </ScrollReveal>
  )
}

export function AwardsSection() {
  return (
    <section id="awards" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal className="text-center mb-16">
          <h2 className="font-display text-4xl lg:text-[56px] font-semibold text-ink-900 leading-tight">
            国际设计奖项 · 全球顶级认可
          </h2>
          <p className="font-display mt-4 text-xl text-ink-600 max-w-2xl mx-auto">
            在设计界的殿堂中，我们与世界一流品牌同台获奖
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 justify-items-center">
          {awards.map((award, i) => (
            <AwardBadge key={award.name} award={award} delay={i * 150} />
          ))}
        </div>

        <ScrollReveal delay={600} className="mt-12 text-center">
          <p className="text-sm text-ink-400">
            获奖率低于 1% · 全球最具影响力的设计奖项
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
