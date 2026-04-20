import { motion } from 'framer-motion'
import { courses } from '../../../data/courses'

export function CurriculumSection() {
  return (
    <section className="bg-white py-16 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="mb-12 text-center text-4xl font-extrabold text-wood-900 dark:text-white">
          从零到一起飞，只需五步
        </h2>

        {/* 时间轴/步骤条 */}
        <div className="relative">
          {/* 连接线 */}
          <div className="absolute left-8 top-0 h-full w-0.5 bg-wood-200 dark:bg-slate-700 md:left-1/2 md:-translate-x-0.5" />

          {courses.map((chapter, idx) => (
            <motion.div
              key={chapter.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.15, duration: 0.5 }}
              className={`relative mb-12 flex items-start gap-6 md:gap-8 ${
                idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              }`}
            >
              {/* 步骤圆圈 */}
              <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-tech-600 text-xl font-extrabold text-white shadow-lg dark:bg-tech-500 md:absolute md:left-1/2 md:-translate-x-1/2">
                {chapter.order}
              </div>

              {/* 内容卡片 */}
              <div
                className={`flex-1 rounded-lg border border-black/5 bg-wood-50 p-6 shadow-soft dark:border-white/10 dark:bg-slate-800 ${
                  idx % 2 === 0 ? 'md:mr-auto md:w-[45%] md:text-right' : 'md:ml-auto md:w-[45%]'
                }`}
              >
                <h3 className="mb-2 text-xl font-extrabold text-wood-900 dark:text-white">
                  {chapter.title}
                </h3>
                <p className="text-slate-700 dark:text-slate-300">
                  {chapter.title.includes('认识榫卯')
                    ? '学习传统工艺，理解结构基础。'
                    : chapter.title.includes('无人机原理')
                      ? '掌握飞行科学，了解核心部件。'
                      : chapter.title.includes('设计基础')
                        ? '进入设计工作台，开始自由创造。'
                        : chapter.title.includes('动手制作')
                          ? '收到实体零件，亲手完成组装。'
                          : '见证作品起飞，学会分析与迭代。'}
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {chapter.lessons.length} 个课时 · 约{' '}
                  {chapter.lessons.reduce((s, l) => s + l.duration, 0)} 分钟
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
