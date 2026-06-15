import { ScrollReveal } from '../../../components/common/ScrollReveal'
import { SectionHeading } from '../components/SectionHeading'

const cards = [
  {
    img: '/resource/picture/flight_png/untitled.160.png',
    title: '榫卯结构',
    subtitle: '传统工艺 × 现代科技',
    desc: '从中国传统造物智慧出发，让学生在拼装中理解"结构即力学"。',
  },
  {
    img: '/resource/picture/learning_kids/EX4A6148.png',
    title: '真实飞行',
    subtitle: '不是模拟器，是真会飞',
    desc: '完成设计即可试飞。从零件到起飞，见证完整工程过程。',
  },
  {
    img: '/resource/picture/learning_kids/EX4A6264 1.png',
    title: '系统课程',
    subtitle: '12 课时完整教学包',
    desc: '教案、学生手册、软件平台、硬件套件——学校拿到的是方案，不是零件盒。',
  },
]

export function WhyUsSection() {
  return (
    <section className="bg-sky-50/40 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal className="mb-16">
          <SectionHeading
            eyebrow="为什么是我们"
            title="不只是另一个 STEAM 玩具"
            lead="我们重新定义了中国青少年 STEAM 教育的三件事"
          />
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 100}>
              <div className="group h-full rounded-2xl border border-sky-100/70 bg-white p-[30px] shadow-[0_2px_18px_rgba(42,136,219,0.05)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(42,136,219,0.13)]">
                <div className="h-[200px] rounded-xl overflow-hidden bg-sky-50 mb-5">
                  <img
                    src={card.img}
                    alt={card.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
                <h3 className="font-display text-2xl font-semibold text-sky-900">{card.title}</h3>
                <p className="mt-1 text-sm font-medium text-sky-500">{card.subtitle}</p>
                <p className="mt-3 text-base leading-relaxed text-sky-700">{card.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
