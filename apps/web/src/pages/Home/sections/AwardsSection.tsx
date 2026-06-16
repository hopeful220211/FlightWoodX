import { ScrollReveal } from '../../../components/common/ScrollReveal'
import { SectionHeading } from '../components/SectionHeading'

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
      <div className="group relative w-[200px] h-[200px] lg:w-[240px] lg:h-[240px] flex items-center justify-center rounded-2xl bg-sky-50/50 border border-sky-100/70 shadow-[0_2px_18px_rgba(42,136,219,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-sky-glow">
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
              fallback.innerHTML = `<span class="text-[#E8B530]">${'★'}</span><span class="text-sky-900 font-semibold text-lg">${award.name}</span>`
              parent.appendChild(fallback)
            }
          }}
        />
      </div>
      <h3 className="mt-4 text-xl font-semibold text-sky-900">{award.name}</h3>
      <p className="text-sm text-sky-700">{award.subtitle}</p>
      <p className="text-sm text-sky-500">{award.year}</p>
    </ScrollReveal>
  )
}

export function AwardsSection() {
  return (
    <section id="awards" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal className="mb-16">
          <SectionHeading
            eyebrow="拿过的奖"
            title="这几个国际设计奖，我们拿到了"
            lead="红点、iF、IDEA、G-Mark，下面这四个都在手上。"
          />
        </ScrollReveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 justify-items-center">
          {awards.map((award, i) => (
            <AwardBadge key={award.name} award={award} delay={i * 150} />
          ))}
        </div>

        <ScrollReveal delay={600} className="mt-12 text-center">
          <p className="text-sm text-sky-500">
            其中红点 Best of the Best，是红点奖里最高的一档。
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
