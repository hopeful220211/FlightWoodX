import { useState } from 'react'
import { Button } from '../../../components/common/Button'
import { AuthModal } from '../../../components/features/auth/AuthModal'

export function FinalCTASection() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
      <section className="bg-gradient-to-br from-tech-600 to-tech-800 py-20 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="mb-6 text-4xl font-extrabold md:text-5xl">
            准备好开启孩子的创造力引擎了吗？
          </h2>
          <Button size="lg" variant="secondary" onClick={() => setShowAuthModal(true)}>
            立即免费注册
          </Button>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-black/5 bg-white py-12 dark:border-white/10 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 text-lg font-extrabold text-wood-900 dark:text-white">
                FlightWoodX
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                用榫卯智慧，设计你的第一架无人机
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">产品</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    学习中心
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    设计工作台
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    作品展示
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">关于</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    公司信息
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    联系我们
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-extrabold text-slate-900 dark:text-white">法律</h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    隐私政策
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-tech-600 dark:hover:text-tech-400">
                    服务条款
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-black/5 pt-8 text-center text-sm text-slate-600 dark:border-white/10 dark:text-slate-400">
            <p>© 2026 FlightWoodX. 保留所有权利。</p>
          </div>
        </div>
      </footer>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
