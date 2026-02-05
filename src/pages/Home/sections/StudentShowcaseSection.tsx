import { motion } from 'framer-motion'
import { Card } from '../../../components/common/Card'
import { featuredWorks } from '../../../data/featuredWorks'

export function StudentShowcaseSection() {
  return (
    <section className="bg-wood-50 py-16 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="mb-10 text-center text-4xl font-extrabold text-wood-900 dark:text-white">
          来自小创客们的奇思妙想
        </h2>

        {/* 水平滚动传送带 */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 md:gap-6">
            {featuredWorks.slice(0, 8).map((work, idx) => (
              <motion.div
                key={work.id}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="w-[240px] flex-shrink-0"
              >
                <Card hoverable>
                  <div className="h-[135px] overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                    <img
                      src={work.thumbnailUrl}
                      alt={work.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="mb-1 truncate text-base font-extrabold text-wood-900 dark:text-white">
                      {work.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      设计师：{work.authorName}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
