import { useState } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '../../../components/common/Button'
import { AuthModal } from '../../../components/features/auth/AuthModal'

// 使用项目中实际存在的图片路径
const heroImage = '/resource/picture/flight_png/untitled.297.png'

export function HeroSection() {
  const [showAuthModal, setShowAuthModal] = useState(false)

  return (
    <>
      <section
        id="home"
        className="relative bg-gradient-to-br from-gray-50 via-wood-50/20 to-gray-50 overflow-hidden pt-4 md:pt-8"
      >
        {/* 装饰性的模糊光晕效果 */}
        <div className="absolute left-10 top-40 h-20 w-20 rounded-full bg-tech-200/50 opacity-60 blur-3xl" />
        <div className="absolute bottom-40 right-10 h-32 w-32 rounded-full bg-wood-300/40 opacity-50 blur-3xl" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[calc(100vh-5rem)] items-center gap-12 py-8 lg:grid-cols-2 lg:gap-16 lg:py-12">
            {/* 左侧内容区域 */}
            <div className="z-10 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-wood-100 px-4 py-2 text-wood-600">
                <Sparkles size={16} />
                <span className="text-sm font-semibold">开启创意飞行之旅</span>
              </div>

              <div className="space-y-6">
                <h1 className="text-6xl font-black leading-tight text-gray-900 sm:text-7xl lg:text-8xl">
                  FLIGHT
                  <span className="block bg-gradient-to-r from-wood-500 to-wood-600 bg-clip-text text-transparent">
                    WOOD X
                  </span>
                </h1>

                <p className="max-w-xl text-xl leading-relaxed text-gray-600 sm:text-2xl">
                  让孩子们亲手设计和制作
                  <span className="font-semibold text-wood-500"> 属于自己的木质无人机</span>
                </p>

                <p className="max-w-lg text-lg text-gray-500">
                  通过寓教于乐的方式，培养创造力、动手能力和科技思维，开启精彩的STEAM学习之旅
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="primary"
                  rightIcon={
                    <ArrowRight
                      size={20}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  }
                  onClick={() => setShowAuthModal(true)}
                  className="group bg-wood-500 hover:bg-wood-600 hover:shadow-lg hover:shadow-wood-500/30"
                >
                  <span className="text-lg">开始探索</span>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    // 观看视频功能，可以后续添加
                  }}
                  className="border-2 border-gray-200 bg-white text-gray-700 hover:border-wood-500 hover:text-wood-500"
                >
                  <span className="text-lg">观看视频</span>
                </Button>
              </div>

              {/* 数据统计 */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                <div>
                  <div className="text-3xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-500">学员</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">50+</div>
                  <div className="text-sm text-gray-500">课程</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-900">98%</div>
                  <div className="text-sm text-gray-500">满意度</div>
                </div>
              </div>
            </div>

            {/* 右侧图片区域 */}
            <div className="relative flex items-center justify-center lg:h-[600px]">
              <div className="relative w-full max-w-xl">
                {/* 图片底部的发光效果 */}
                <div className="absolute inset-0 scale-110 rounded-full bg-gradient-to-br from-wood-400 to-wood-600 opacity-20 blur-3xl" />

                {/* 主图片 */}
                <div className="relative">
                  <img
                    src={heroImage}
                    alt="木质无人机"
                    className="h-auto w-full animate-float drop-shadow-2xl"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 波浪形底部边缘 */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
              fill="white"
            />
          </svg>
        </div>
      </section>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
