/**
 * Hero 背景里缓慢漂移的云彩层。
 * 使用 public/clouds/ 下的透明 PNG 云朵；配合 CSS 动画
 * （.hero-cloud / cloudDrift，定义在 index.css）横向漂移。
 *
 * 注意：当前素材的云在图片边缘是被切平的（非居中、无透明余量），
 * 因此这里用 mask 给每朵云做边缘羽化，把硬切边淡化成柔和过渡。
 * prefers-reduced-motion 下全局自动停。
 */

interface CloudConfig {
  src: string
  top: string
  /** 云宽（px），越大越有气势 */
  width: number
  opacity: number
  /** 漂移一圈时长（秒），越大越慢、停留越久 */
  duration: number
  /** 负值 = 让云一开始就分布在屏幕不同位置 */
  delay: number
  /** 额外模糊（px）；远处的云糊一点增加纵深 */
  blur: number
  /** 水平翻转，让重复使用的同一张图看起来不一样 */
  flip?: boolean
}

const WIDE_1 = '/clouds/cloud-wide-1.png'
const WIDE_2 = '/clouds/cloud-wide-2.png'
const PUFF_1 = '/clouds/cloud-puff-1.png'
const PUFF_2 = '/clouds/cloud-puff-2.png'

// 边缘羽化：左右 + 上下两道线性渐变求交集，把素材自带的硬切边
// （尤其 wide 云带的左右两端）明确淡化成渐变过渡，看不出裁切竖边。
const FEATHER =
  'linear-gradient(to right, transparent 0%, #000 16%, #000 84%, transparent 100%), ' +
  'linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)'

const CLOUDS: CloudConfig[] = [
  // 顶部大云带，气势主角
  { src: WIDE_1, top: '-4%', width: 820, opacity: 0.92, duration: 150, delay: 0, blur: 0 },
  // 中部大云，很慢、长时间停留，翻转避免重复感
  { src: WIDE_2, top: '34%', width: 720, opacity: 0.8, duration: 210, delay: -70, blur: 0.5, flip: true },
  // 偏下大云带，速度中等
  { src: WIDE_1, top: '60%', width: 600, opacity: 0.66, duration: 120, delay: -40, blur: 0.5, flip: true },
  // 上方中云
  { src: PUFF_1, top: '4%', width: 460, opacity: 0.7, duration: 185, delay: -120, blur: 1 },
  // 远处小云，极慢，几乎一直在
  { src: PUFF_2, top: '26%', width: 320, opacity: 0.5, duration: 260, delay: -95, blur: 1.6 },
  // 底部小云，稍快掠过
  { src: WIDE_2, top: '74%', width: 420, opacity: 0.58, duration: 100, delay: -25, blur: 0 },
]

export function CloudLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="hero-cloud absolute left-0"
          style={{
            top: c.top,
            animationDuration: `${c.duration}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          <img
            src={c.src}
            alt=""
            aria-hidden="true"
            decoding="async"
            className="block max-w-none select-none"
            style={{
              width: `${c.width}px`,
              opacity: c.opacity,
              filter: c.blur ? `blur(${c.blur}px)` : undefined,
              transform: c.flip ? 'scaleX(-1)' : undefined,
              maskImage: FEATHER,
              WebkitMaskImage: FEATHER,
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          />
        </div>
      ))}
    </div>
  )
}
