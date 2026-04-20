import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

const uiScreenshots = [
  { name: '设计工作台', img: '/resource/picture/UI/design_ui.jpg' },
  { name: '产品展示', img: '/resource/picture/UI/product_show.jpg' },
  { name: 'AR展示', img: '/resource/picture/UI/AR_show.jpg' },
]

export function UIShowcaseSection() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % uiScreenshots.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-24">
      {/* 模糊背景 */}
      <div className="absolute inset-0 opacity-20">
        <img
          src={uiScreenshots[currentIndex].img}
          alt=""
          className="h-full w-full object-cover blur-3xl"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4">
        <h2 className="mb-12 text-center text-4xl font-extrabold text-white">
          为创造而生的直观设计工具
        </h2>

        {/* 设备模型 + 轮播 */}
        <div className="relative mx-auto max-w-4xl">
          <div className="relative rounded-lg bg-slate-800/50 p-8 backdrop-blur-sm">
            <div className="relative overflow-hidden rounded-lg shadow-2xl aspect-video">
              {uiScreenshots.map((screenshot, idx) => (
                <motion.div
                  key={idx}
                  initial={false}
                  animate={{
                    opacity: idx === currentIndex ? 1 : 0,
                    scale: idx === currentIndex ? 1 : 0.95,
                  }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="absolute inset-0"
                  style={{ pointerEvents: idx === currentIndex ? 'auto' : 'none' }}
                >
                  <img
                    src={screenshot.img}
                    alt={screenshot.name}
                    className="h-full w-full object-cover"
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `data:image/svg+xml;utf8,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Inter" font-size="24" fill="#94a3b8">${screenshot.name}</text></svg>`
                      )}`
                    }}
                  />
                </motion.div>
              ))}
            </div>

            {/* 指示器 */}
            <div className="mt-6 flex justify-center gap-2">
              {uiScreenshots.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'w-8 bg-tech-400' : 'w-2 bg-white/30'
                  }`}
                  aria-label={`切换到${uiScreenshots[idx].name}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
