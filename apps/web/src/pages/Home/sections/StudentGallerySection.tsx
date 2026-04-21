import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'

const works = [
  { id: '1', name: '森林守望者', author: '小明', img: '/resource/picture/student_works/work01.png' },
  { id: '2', name: '天际穿梭号', author: '小红', img: '/resource/picture/student_works/work02.png' },
  { id: '3', name: '竹蜻蜓 X', author: '小华', img: '/resource/picture/student_works/work03.png' },
  { id: '4', name: '木鸢一号', author: '小李', img: '/resource/picture/student_works/work04.png' },
  { id: '5', name: '云雀探索者', author: '小张', img: '/resource/picture/student_works/work05.png' },
  { id: '6', name: '星辰号', author: '小王', img: '/resource/picture/student_works/work06.png' },
  // Placeholders for future works
  { id: '7', name: '即将展示', author: '等你来创', img: '' },
  { id: '8', name: '即将展示', author: '等你来创', img: '' },
]

export function StudentGallerySection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = 300
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <section className="bg-paper-50 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-4">
        <ScrollReveal className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-display text-4xl lg:text-[52px] font-semibold text-ink-900 leading-tight">
              学生设计的无人机
            </h2>
            <p className="font-display mt-3 text-xl text-ink-600">每架都是独一无二的作品</p>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll('left')}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-200 text-ink-400 hover:border-ink-400 hover:text-ink-700 transition-colors"
              aria-label="向左滚动"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scroll('right')}
              className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-200 text-ink-400 hover:border-ink-400 hover:text-ink-700 transition-colors"
              aria-label="向右滚动"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </ScrollReveal>

        {/* Horizontal scroll */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {works.map((work) => (
            <div key={work.id} className="w-[280px] shrink-0">
              <div className="group relative aspect-square overflow-hidden rounded-md bg-paper-200">
                {work.img ? (
                  <img
                    src={work.img}
                    alt={work.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-paper-200">
                    <span className="text-sm text-ink-400">即将展示</span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{work.name}</p>
                    <p className="text-xs text-white/70">{work.author}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <ScrollReveal delay={200} className="mt-8 text-center">
          <button
            onClick={() => navigate('/gallery')}
            className="inline-flex w-fit items-center gap-2 whitespace-nowrap text-sm font-medium text-wood-500 hover:text-wood-600 transition-colors"
          >
            查看全部作品
            <ArrowRight size={16} />
          </button>
        </ScrollReveal>
      </div>
    </section>
  )
}
