import { ScrollReveal } from '../../../components/common/ScrollReveal'

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
    <section className="bg-paper-50 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal className="text-center mb-16">
          <h2 className="text-4xl lg:text-[52px] font-semibold text-ink-900 leading-tight">
            不只是另一个 STEAM 玩具
          </h2>
          <p className="mt-4 text-xl text-ink-600 max-w-2xl mx-auto">
            我们重新定义了中国青少年 STEAM 教育的三件事
          </p>
        </ScrollReveal>

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card, i) => (
            <ScrollReveal key={card.title} delay={i * 100}>
              <div className="group bg-paper-100 rounded-md p-[30px] transition-all duration-300 hover:-translate-y-[3px] hover:shadow-soft">
                <div className="h-[200px] rounded-sm overflow-hidden bg-paper-200 mb-5">
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
                <h3 className="text-2xl font-semibold text-ink-900">{card.title}</h3>
                <p className="mt-1 text-sm font-medium text-wood-500">{card.subtitle}</p>
                <p className="mt-3 text-base leading-relaxed text-ink-600">{card.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
