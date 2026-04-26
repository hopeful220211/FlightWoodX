import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { ScrollReveal } from '../../../components/common/ScrollReveal'

type TestimonialRole = 'child' | 'parent' | 'teacher'

interface Testimonial {
  id: string
  name: string
  identity: string
  role: TestimonialRole
  avatarColor: string
  avatarInitial: string
  avatarTextColor: string
  quote: string
}

const TESTIMONIALS: Testimonial[] = [
  {
    id: 'xiaoyu',
    name: '小宇',
    identity: '五年级学生',
    role: 'child',
    avatarColor: '#7DB8D9',
    avatarInitial: '宇',
    avatarTextColor: 'white',
    quote: '我以前觉得无人机就是大人买的那种玩具，飞起来就完了。但自己拼出来之后，我才知道每个零件是干嘛的——为什么机臂要这么长、电机装在哪里才不会打到螺旋桨。飞起来的时候感觉完全不一样，因为是我自己做的。',
  },
  {
    id: 'zhou-mother',
    name: '周女士',
    identity: '小学四年级学生家长',
    role: 'parent',
    avatarColor: '#E8E2D8',
    avatarInitial: '周',
    avatarTextColor: '#1A1A1A',
    quote: '孩子回家不再只盯着 iPad 是最直观的变化。他会主动跟我讲榫卯是什么、为什么老木匠不用钉子——这些话我这个当妈的都答不上来。FlightWoodX 让"动手"这件事重新变得有分量。',
  },
  {
    id: 'xiaoyu-girl',
    name: '小雨',
    identity: '三年级学生',
    role: 'child',
    avatarColor: '#8FB88F',
    avatarInitial: '雨',
    avatarTextColor: 'white',
    quote: '最喜欢的是电脑上设计完，真的能飞起来那一刻。我设计的第一架飞歪了，我自己找到是因为一边机臂长了一点——然后自己改过来就飞直了。感觉像科学家。',
  },
  {
    id: 'lin-father',
    name: '林先生',
    identity: '初中一年级学生父亲，IT 行业',
    role: 'parent',
    avatarColor: '#b8864f',
    avatarInitial: '林',
    avatarTextColor: 'white',
    quote: '作为程序员，我见过太多"编程启蒙"产品——大部分是把语法包装成卡通。FlightWoodX 不一样，它让孩子直接面对真实的工程问题：结构、力学、空气动力学。这是我花钱买不到的东西。',
  },
  {
    id: 'chen-teacher',
    name: '陈老师',
    identity: '市级重点小学科学教师，12 年教龄',
    role: 'teacher',
    avatarColor: '#3D3D3D',
    avatarInitial: '陈',
    avatarTextColor: '#FAF8F4',
    quote: '我带过很多 STEAM 产品进课堂，学生 3 天就腻了。FlightWoodX 是第一个让学生主动要求延长课时的——因为他们想亲眼看到自己设计的那架飞起来。这个"亲手造"的过程是无法被 App 替代的。',
  },
]

const ROLE_BG: Record<TestimonialRole, string> = {
  child: 'rgba(125, 184, 217, 0.2)',
  parent: '#E8E2D8',
  teacher: 'rgba(143, 184, 143, 0.2)',
}

function AvatarPlaceholder({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div
      className="w-[120px] h-[120px] md:w-[120px] md:h-[120px] w-[96px] h-[96px] rounded-md flex items-center justify-center shadow-md"
      style={{ backgroundColor: testimonial.avatarColor, color: testimonial.avatarTextColor }}
    >
      <span className="font-display font-semibold text-[40px]">
        {testimonial.avatarInitial}
      </span>
    </div>
  )
}

const TOTAL = TESTIMONIALS.length
const NORMAL_DELAY = 3000
const MANUAL_DELAY = 6000

export function LovedBySection() {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<number | null>(null)
  const delayRef = useRef(NORMAL_DELAY)

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const start = useCallback(() => {
    stop()
    const tick = () => {
      timerRef.current = window.setTimeout(() => {
        console.log(`[testimonial] auto-tick after ${delayRef.current}ms`)
        setCurrent(i => (i + 1) % TOTAL)
        delayRef.current = NORMAL_DELAY
        timerRef.current = window.setTimeout(tick, NORMAL_DELAY)
      }, delayRef.current)
    }
    tick()
  }, [stop])

  // Mount: start the chain. Unmount: stop.
  useEffect(() => {
    start()
    return stop
  }, [start, stop])

  const handleManualChange = useCallback((idx: number) => {
    const normalized = ((idx % TOTAL) + TOTAL) % TOTAL
    console.log('[testimonial] manual click, next will wait 6000ms')
    setCurrent(normalized)
    delayRef.current = MANUAL_DELAY
    start()
  }, [start])

  const handleMouseEnter = useCallback(() => {
    console.log('[testimonial] hover paused')
    stop()
  }, [stop])

  const handleMouseLeave = useCallback(() => {
    console.log('[testimonial] hover resumed')
    start()
  }, [start])

  const t = TESTIMONIALS[current]
  const bgColor = ROLE_BG[t.role]

  const scrollToCurriculum = () => {
    document.querySelector('[class*="CurriculumSection"], section:nth-of-type(6)')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="bg-paper-100 py-24 lg:py-32"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="mx-auto max-w-4xl px-4">
        <ScrollReveal className="text-center mb-4">
          <p className="text-sm font-medium tracking-wider text-ink-400 uppercase">
            Loved by kids, parents & teachers
          </p>
        </ScrollReveal>
        <ScrollReveal delay={100} className="text-center mb-12">
          <h2 className="font-display text-4xl lg:text-[52px] font-semibold text-ink-900 leading-tight">
            来自孩子、家长和老师的声音
          </h2>
          <p className="font-display mt-3 text-lg text-ink-600">
            真实的反馈，来自最早接触 FlightWoodX 的家庭和教育者
          </p>
        </ScrollReveal>

        {/* Testimonial card */}
        <div className="relative">
          {/* Avatar — overlapping top of card */}
          <div className="flex justify-center mb-[-40px] relative z-10">
            <div
              key={t.id + '-avatar'}
              style={{
                animation: 'fadeInScale 400ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              }}
            >
              <AvatarPlaceholder testimonial={t} />
            </div>
          </div>

          {/* Quote card */}
          <div
            key={t.id}
            className="rounded-md px-8 py-12 md:px-12 md:py-14 pt-16 md:pt-20 transition-colors duration-300"
            style={{ backgroundColor: bgColor }}
          >
            <blockquote
              className="font-display text-lg md:text-[22px] leading-[1.6] text-ink-900 text-center"
              style={{
                animation: 'fadeInLeft 400ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
              }}
            >
              "{t.quote}"
            </blockquote>

            <div
              className="mt-6 text-center"
              style={{
                animation: 'fadeInLeft 400ms cubic-bezier(0.2, 0.8, 0.2, 1) 100ms forwards',
                opacity: 0,
              }}
            >
              <p className="text-base font-semibold text-ink-900">{t.name}</p>
              <p className="text-sm text-ink-600">{t.identity}</p>
            </div>
          </div>

          {/* Bottom row: CTA + indicators + arrows */}
          <div className="mt-6 flex items-center justify-between">
            {/* CTA link */}
            <button
              onClick={scrollToCurriculum}
              className="group inline-flex w-fit items-center gap-1 whitespace-nowrap text-sm font-medium text-wood-500 hover:text-wood-600 transition-colors underline underline-offset-2 hover:decoration-2"
            >
              了解更多课程
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </button>

            {/* Indicators + arrows */}
            <div className="flex items-center gap-4">
              {/* Dots */}
              <div className="flex items-center gap-3">
                {TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleManualChange(i)}
                    className={`rounded-full transition-colors ${
                      i === current ? 'w-2 h-2 bg-wood-500' : 'w-2 h-2 bg-ink-200 hover:bg-ink-400'
                    }`}
                    aria-label={`查看第 ${i + 1} 条反馈`}
                  />
                ))}
              </div>

              {/* Arrows */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleManualChange(current - 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-md bg-paper-100 text-ink-600 transition-colors hover:bg-paper-200"
                  aria-label="上一条"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => handleManualChange(current + 1)}
                  className="flex h-12 w-12 items-center justify-center rounded-md bg-ink-900 text-white transition-colors hover:bg-ink-700"
                  aria-label="下一条"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
