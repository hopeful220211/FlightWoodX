# fwx-motion 配方库（完整代码）

> React 19 + TypeScript + GSAP + `@gsap/react`。每条配方都已套用 SKILL.md 的三条约定（useGSAP+scope / matchMedia 减弱 / transform+opacity）。
> Tailwind 用 FlightWoodX 设计令牌：主色 `sky-500 #2b88db`、木色 `wood-*`、`bg-sky-hero` 渐变、`shadow-soft/lift/sky-glow`。
>
> 目录：
> 1. Pinned Scroll Scene 2. Kinetic Big-Type Reveal 3. Blur Section Transition
> 4. Parallax Layers 5. Glass Card Slide-in 6. Number Count-up
> 7. SVG Connection Draw 8. Logo Orbit / Marquee · 附：插件注册 / 动态加载

---

## 1. Pinned Scroll Scene（钉住 + scrub）

来源：视频1 整段——元素钉在屏内，随滚动逐步演变。视频2 的 AI 聊天卡场景同理。
何时用：Hero 或一个重点区块，想让用户"滚动即驱动一段编排"。

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function PinnedScene() {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: '+=160%',     // 钉住期间的滚动距离，越大演变越慢
          pin: true,
          scrub: 1,          // 1 = 平滑跟随；true = 立即跟随
          anticipatePin: 1,  // 减少 pin 瞬间的跳动
        },
      })
      tl.from('.scene-title', { yPercent: 30, autoAlpha: 0 })
        .from('.scene-card', { yPercent: 60, autoAlpha: 0, scale: 0.92 }, '<0.1')
        .to('.scene-bg', { yPercent: -12 }, 0) // 背景慢移，叠加景深
    })
    // reduced-motion：不钉、不动，直接最终态
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.scene-title, .scene-card', { autoAlpha: 1, yPercent: 0, scale: 1 })
    })
  }, { scope: root })

  return (
    <section ref={root} className="relative h-screen overflow-hidden bg-sky-hero">
      <div className="scene-bg absolute inset-0 -z-10 bg-[url('/img/clouds.jpg')] bg-cover" />
      <h2 className="scene-title text-6xl font-display text-sky-900">动手造，会飞的。</h2>
      <div className="scene-card mx-auto mt-10 w-[min(90vw,720px)] rounded-2xl bg-white/85 p-6 shadow-lift backdrop-blur" />
    </section>
  )
}
```

要点：钉住区块本身要 `h-screen` 且 `overflow-hidden`；`end:'+=160%'` 是经验值，调大变慢。pin 会在 DOM 里插入 spacer，父容器别设奇怪的 transform。

---

## 2. Kinetic Big-Type Reveal（动态大字逐词 / 逐行揭示）

来源：视频1 `MAKE IT ONCE.` / `RUN IT EVERYWHERE.` / `ORGANIZE` 逐词蹦出。
何时用：标语、章节大标题的入场。

**首选：SplitText（GSAP 3.13+ 免费）+ mask 行揭示**

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText)

export function BigTypeReveal({ text }: { text: string }) {
  const root = useRef<HTMLHeadingElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const split = new SplitText(root.current, {
        type: 'lines,words',
        linesClass: 'overflow-hidden', // 行容器裁切，制造"从下方升起"
      })
      gsap.from(split.words, {
        yPercent: 110, autoAlpha: 0,
        duration: 0.7, ease: 'power3.out', stagger: 0.06,
        scrollTrigger: { trigger: root.current, start: 'top 80%' },
      })
      return () => split.revert() // 清理：还原拆分的 DOM
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(root.current, { autoAlpha: 1 })
    })
  }, { scope: root, dependencies: [text] })

  return <h1 ref={root} className="text-7xl font-display font-bold text-sky-900">{text}</h1>
}
```

**无插件回退**（不想引入 SplitText 时，手动按词包 span）：

```tsx
const words = text.split(' ')
// JSX:
<h1 ref={root} className="text-7xl font-display font-bold text-sky-900">
  {words.map((w, i) => (
    <span key={i} className="inline-block overflow-hidden align-bottom">
      <span className="word inline-block">{w}&nbsp;</span>
    </span>
  ))}
</h1>
// 动画：gsap.from('.word', { yPercent: 110, autoAlpha: 0, stagger: 0.06, ease: 'power3.out',
//        scrollTrigger: { trigger: root.current, start: 'top 80%' } })
```

要点：外层 `overflow-hidden` 是"升起"质感的关键。逐词够用，逐字符（`type:'chars'`）慎用——对中文会拆得很碎，且读屏体验差。

---

## 3. Blur Section Transition（缩放 + 透明 + 模糊转场）

来源：视频1/视频2 区块之间从虚化中浮现（视频2 `Take control of your capital.` 由模糊变清晰）。
何时用：两屏切换、内容进场时想要"对焦"质感。

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function BlurReveal({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(root.current,
        { autoAlpha: 0, scale: 1.06, filter: 'blur(14px)' },
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)',
          duration: 1, ease: 'power2.out',
          scrollTrigger: { trigger: root.current, start: 'top 75%' } })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set(root.current, { autoAlpha: 1, scale: 1, filter: 'blur(0px)' })
    })
  }, { scope: root })

  return <div ref={root} className="will-change-[filter,transform,opacity]">{children}</div>
}
```

要点：`filter:blur()` 比 transform 略贵，**只在少数重点区块用**，别给整列卡片都加。`will-change` 提示合成层，但用完即弃，别全站常驻。

---

## 4. Parallax Layers（多层视差）

来源：视频2 hero 山岩照片 + 浮层卡的景深；视频1 云背景慢移。
何时用：照片/插画背景想比前景慢，营造纵深。

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function ParallaxHero() {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const st = { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true }
      gsap.to('.layer-back',  { yPercent: -20, ease: 'none', scrollTrigger: st }) // 最慢
      gsap.to('.layer-mid',   { yPercent: -10, ease: 'none', scrollTrigger: st })
      gsap.to('.layer-front', { yPercent:  -4, ease: 'none', scrollTrigger: st }) // 最快
    })
    // reduced-motion：不加 transform，照片静止即可，无需 set
  }, { scope: root })

  return (
    <div ref={root} className="relative h-[120vh] overflow-hidden">
      <img className="layer-back absolute inset-0 h-full w-full object-cover" src="/img/rock.jpg" />
      <div className="layer-mid absolute inset-0 …" />
      <h1 className="layer-front relative z-10 …">A New Standard</h1>
    </div>
  )
}
```

要点：视差层 ease 必须 `'none'`（线性），否则跟手感很怪。`yPercent` 用相对百分比，天然响应式。reduced-motion 下直接不建这些 tween 即可。

---

## 5. Glass Card Slide-in（玻璃浮卡批量滑入）

来源：视频2 三栏特征卡（图片底 + 玻璃浮层）进视口错峰揭示。
何时用：一组卡片/特征块进入视口时上滑淡入。**多张时用 batch，不要一卡一 trigger。**

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function FeatureCards({ items }: { items: { title: string; img: string }[] }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.set('.glass-card', { autoAlpha: 0, y: 40 })
      ScrollTrigger.batch('.glass-card', {
        start: 'top 85%',
        onEnter: (els) =>
          gsap.to(els, { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.6, ease: 'power2.out', overwrite: true }),
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.glass-card', { autoAlpha: 1, y: 0 })
    })
  }, { scope: root, dependencies: [items.length] })

  return (
    <div ref={root} className="grid gap-6 md:grid-cols-3">
      {items.map((it) => (
        <article key={it.title}
          className="glass-card relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-6 shadow-soft backdrop-blur-md">
          <img src={it.img} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60" />
          <h3 className="text-lg font-semibold text-ink-900">{it.title}</h3>
        </article>
      ))}
    </div>
  )
}
```

玻璃质感是 CSS 不是 GSAP：`bg-white/30 backdrop-blur-md border-white/40`。GSAP 只管入场。`batch` 把多张卡的进场合并调度，几十张也只有一组逻辑。

---

## 6. Number Count-up（数字滚动）

来源：视频2 `12.4%`、`¥345,371`、`$344,711.74` 进视口从 0 滚到目标。
何时用：数据强调（资产、点赞数、零件数、课时数）。

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(useGSAP, ScrollTrigger)

export function CountUp({ to, prefix = '', suffix = '', decimals = 0 }:
  { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const el = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    const fmt = (n: number) =>
      prefix + n.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const obj = { v: 0 }
      gsap.to(obj, {
        v: to, duration: 1.4, ease: 'power1.out',
        snap: { v: decimals ? 1 / 10 ** decimals : 1 },
        onUpdate: () => { if (el.current) el.current.textContent = fmt(obj.v) },
        scrollTrigger: { trigger: el.current, start: 'top 85%', once: true },
      })
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      if (el.current) el.current.textContent = fmt(to) // 直接显示最终值
    })
  }, { scope: el, dependencies: [to] })

  return <span ref={el} className="tabular-nums">{prefix}0{suffix}</span>
}
// <CountUp to={345371.74} prefix="¥" decimals={2} />  ·  <CountUp to={77} suffix=" 个零件" />
```

要点：tween 一个**普通对象**的值，`onUpdate` 写进 DOM——别直接 tween `textContent`。`once:true` 只播一次。`tabular-nums` 防止数字跳动时宽度抖。

---

## 7. SVG Connection Draw（连线网络图绘制）

来源：视频2「One platform. Multiple intelligence layers.」中心节点向四周逐条连线 + 节点点亮。
何时用：架构图、知识图谱、"主板连接各零件"这类关系可视化（很贴 FlightWoodX 的榫卯连接概念）。

**首选：DrawSVG（GSAP 3.13+ 免费）**

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
gsap.registerPlugin(useGSAP, ScrollTrigger, DrawSVGPlugin)

export function NetworkDraw() {
  const root = useRef<SVGSVGElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: root.current, start: 'top 70%' } })
      tl.from('.edge', { drawSVG: '0%', duration: 0.6, stagger: 0.15, ease: 'power1.inOut' })
        .from('.node', { scale: 0, transformOrigin: 'center', autoAlpha: 0, stagger: 0.1 }, '<0.2')
    })
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('.edge', { drawSVG: '100%' }); gsap.set('.node', { scale: 1, autoAlpha: 1 })
    })
  }, { scope: root })

  return (
    <svg ref={root} viewBox="0 0 400 240" className="w-full">
      <line className="edge" x1="200" y1="120" x2="60"  y2="60"  stroke="#2b88db" strokeWidth="1.5" />
      <line className="edge" x1="200" y1="120" x2="340" y2="60"  stroke="#2b88db" strokeWidth="1.5" />
      <line className="edge" x1="200" y1="120" x2="340" y2="190" stroke="#2b88db" strokeWidth="1.5" />
      <circle className="node" cx="200" cy="120" r="10" fill="#2b88db" />
      <circle className="node" cx="60"  cy="60"  r="6"  fill="#a67038" />
      <circle className="node" cx="340" cy="60"  r="6"  fill="#a67038" />
      <circle className="node" cx="340" cy="190" r="6"  fill="#a67038" />
    </svg>
  )
}
```

**无插件回退**（用原生 `stroke-dasharray/offset`）：

```tsx
// 每条 line 先用 ref 量长度：const len = lineEl.getTotalLength()
// gsap.set(lineEl, { strokeDasharray: len, strokeDashoffset: len })
// gsap.to('.edge', { strokeDashoffset: 0, stagger: 0.15, scrollTrigger: {...} })
```

要点：DrawSVG 的 `drawSVG:'0%'→from` 表示从空画到满。回退方案需先测每条线长度设 dasharray。节点 `scale` 记得给 `transformOrigin:'center'`（SVG 默认原点在左上）。

---

## 8. Logo Orbit / Marquee（品牌墙：轨道 / 无缝跑马灯）

来源：视频2 集成 logo 绕中心 CORE 排列 / 横向滚动品牌墙。
何时用：合作方、集成方、奖项 logo 展示。

**A. 无缝横向跑马灯**（最常用，性能最好）

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
gsap.registerPlugin(useGSAP)

export function LogoMarquee({ logos }: { logos: string[] }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // 轨道里渲染两份 logos，向左移 50% 后无缝衔接
      gsap.to('.track', { xPercent: -50, duration: 20, ease: 'none', repeat: -1 })
    })
    // reduced-motion：不滚动，静态排列（不建 tween 即可）
  }, { scope: root })

  return (
    <div ref={root} className="overflow-hidden">
      <div className="track flex w-max gap-12">
        {[...logos, ...logos].map((src, i) => (
          <img key={i} src={src} className="h-10 opacity-70" alt="" />
        ))}
      </div>
    </div>
  )
}
```

**B. 绕中心轨道**（节点环绕，子元素反向自转以保持正立）

```tsx
// 容器: position relative; 每个 logo 绝对定位在圆周上（用 CSS 或计算 transform）
// gsap.to('.orbit', { rotation: 360, duration: 30, ease: 'none', repeat: -1, transformOrigin: 'center' })
// gsap.to('.orbit .logo', { rotation: -360, duration: 30, ease: 'none', repeat: -1 }) // 抵消，保持正立
```

要点：跑马灯渲染**两份**内容、移 `-50%` 实现无缝。`ease:'none'` + `repeat:-1` 匀速循环。reduced-motion 下直接静态排列。无限循环动画在弱网/低端机要适度，logo 别太多。

---

## 附：插件注册与按需加载

- 注册一次即可（建议在用到的组件顶层模块）：
  ```ts
  import gsap from 'gsap'
  import { useGSAP } from '@gsap/react'
  import { ScrollTrigger } from 'gsap/ScrollTrigger'
  gsap.registerPlugin(useGSAP, ScrollTrigger)
  ```
- **SplitText / DrawSVGPlugin** 自 GSAP 3.13（2025）起随核心免费，路径 `gsap/SplitText`、`gsap/DrawSVGPlugin`。能用回退就用回退，少装少打包。
- **弱网/首屏敏感页**：把动效组件做成路由级 `React.lazy`，或在 `useGSAP` 里 `await import('gsap/ScrollTrigger')` 动态加载插件，避免 GSAP+插件进首屏 chunk（呼应 FlightWoodX 的包体瘦身目标）。
- 布局变化（图片懒加载完成、字体到位）后调用 `ScrollTrigger.refresh()` 修正起止点。
