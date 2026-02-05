import { motion } from 'framer-motion'

export function STEAMSection() {
  return (
    <section className="bg-white py-16 dark:bg-slate-900">
      <div className="mx-auto max-w-6xl px-4">
        {/* S & T */}
        <div className="mb-16 grid gap-8 md:grid-cols-2 md:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <img
              src="/resource/picture/learning_kids/EX4A6148.png"
              alt="孩子们在研究"
              className="rounded-2xl shadow-lift"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="mb-4 text-3xl font-extrabold text-wood-900 dark:text-white">
              <span className="text-tech-600">S</span>cience & <span className="text-tech-600">T</span>echnology:
              科学与技术的融合
            </h3>
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              通过亲手组装无人机，孩子们将直观学习空气动力学、电子电路和编程基础，将抽象的科学原理转化为看得见的飞行奇迹。
            </p>
          </motion.div>
        </div>

        {/* E & A */}
        <div className="mb-16 grid gap-8 md:grid-cols-2 md:items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-2 md:order-1"
          >
            <h3 className="mb-4 text-3xl font-extrabold text-wood-900 dark:text-white">
              <span className="text-tech-600">E</span>ngineering & <span className="text-tech-600">A</span>rts:
              工程与艺术的碰撞
            </h3>
            <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              我们用现代设计重构了千年榫卯。孩子们在搭建过程中，不仅是在实践工程思维，更是在感受结构之美，用艺术的眼光创造独一无二的作品。
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="order-1 md:order-2"
          >
            <img
              src="/resource/picture/flight_png/untitled.160.png"
              alt="无人机榫卯结构细节"
              className="rounded-2xl shadow-lift"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </motion.div>
        </div>

        {/* M */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <img
            src="/resource/picture/flight_png/untitled.303.png"
            alt="从设计到成品"
            className="mx-auto mb-6 max-w-2xl rounded-2xl shadow-lift"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
          <h3 className="mb-4 text-3xl font-extrabold text-wood-900 dark:text-white">
            <span className="text-tech-600">M</span>athematics: 贯穿始终的数学逻辑
          </h3>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            从计算推重比，到调整重心，再到设计对称的结构，数学不再是枯燥的公式，而是确保无人机成功起飞的关键。
          </p>
        </motion.div>
      </div>
    </section>
  )
}
