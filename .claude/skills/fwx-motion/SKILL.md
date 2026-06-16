---
name: fwx-motion
description: FlightWoodX 前端交互动效 playbook —— 用 GSAP 在 React 19 实现高端落地页/编辑器的滚动与揭示动效。覆盖 8 类可复用配方：滚动钉住+scrub、动态大字逐词/逐行揭示、scale+opacity+blur 区块转场、多层视差、玻璃浮卡滑入、数字 count-up、SVG 连线网络图绘制、logo 轨道/跑马灯。当用户要给 FlightWoodX（或任意 React+GSAP 项目）做落地页动效、scroll 动画、hero 揭示、区块转场、视差、卡片入场、数字滚动、节点图连线、品牌墙，或说"加点动效/让它动起来/参考 Awwwards 那种"时使用，即使没点名 GSAP 也应主动用本 skill。配方默认 useGSAP+gsap.context 自动清理、强制尊重 prefers-reduced-motion、transform/opacity 优先。深 API 细节转交 gsap-* 系列 skill。
license: MIT
---

# FlightWoodX 交互动效（fwx-motion）

## 这个 skill 是什么

一套**项目专属**的 GSAP 交互配方，把高端落地页/产品页里反复出现的动效（滚动揭示、动态大字、区块转场、视差、玻璃卡、数字滚动、连线图、品牌墙）固化成 React 19 即贴即用的代码，并统一 FlightWoodX 的工程约定。

**它不重复 GSAP API 文档。** 需要某个 API 的完整细节时，去对应的官方 skill：
- 基础 tween / ease / stagger / `matchMedia` → **gsap-core**
- 时间线编排 / position 参数 → **gsap-timeline**
- 滚动 / pin / scrub / 视差 → **gsap-scrolltrigger**
- React 的 `useGSAP` / scope / `contextSafe` → **gsap-react**
- SplitText / DrawSVG / Draggable / Observer → **gsap-plugins**
- 性能（避免 layout thrash、transform/opacity、`will-change`）→ **gsap-performance**

## 何时用、何时克制（这是给小孩用的产品）

FlightWoodX 的最终用户是 6–15 岁青少年 + 公立学校老师，且学校弱网。所以：

- **展示/营销类页面**（首页 Hero、作品展示、赛事、社区）→ 大胆用，动效是说服力的一部分。
- **工具/编辑器类页面**（设计器、积木编辑器、仿真器）→ **克制**。动效只服务于"看清状态变化"，不抢操作焦点。一个小孩在搭无人机时，不需要标题飞来飞去。
- **永远**尊重 `prefers-reduced-motion`：很多孩子、投影教学环境对强动效敏感，关掉动效后页面必须仍然完整可读、可用（内容最终态直接呈现，不是空白）。
- 时长偏短、ease 偏干脆。教育产品要"清楚"，不要"炫到看不懂"。

## 三条不可妥协的工程约定

所有配方都建立在这三条上，复制配方时不要去掉它们：

### 1. 用 `useGSAP` + scope，自动清理
React 严格模式会双调用 effect；GSAP 动画若不清理会泄漏、重复绑定 ScrollTrigger。`useGSAP({ scope: ref })` 在卸载/重渲染时自动 `revert()`，且把选择器限定在容器内（避免误伤别处的 `.card`）。详见 gsap-react。

```tsx
import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const root = useRef<HTMLDivElement>(null)
useGSAP(() => { /* 动画写这里，选择器自动限定在 root 内 */ }, { scope: root })
return <div ref={root}>…</div>
```

### 2. 用 `gsap.matchMedia` 处理 reduced-motion（而不是手写 if）
把"有动效"和"减弱动效"声明为两套，matchMedia 会在偏好变化时自动 revert 对应那套。减弱分支负责把元素**直接置为最终态**，保证可读。

```tsx
useGSAP(() => {
  const mm = gsap.matchMedia()
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.reveal', { autoAlpha: 0, y: 24, stagger: 0.08 })
  })
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.reveal', { autoAlpha: 1, y: 0 }) // 最终态，无动画
  })
}, { scope: root })
```

### 3. 只动 `transform` 和 `opacity`（弱网 + 低端教学一体机也要顺）
用 `x/y/scale/rotation` 和 `autoAlpha`（= opacity + visibility），不要动 `top/left/width/height/margin`（触发 layout）。`autoAlpha` 比 `opacity` 好，因为它在 0 时设 `visibility:hidden`，元素不再可点、不被读屏。详见 gsap-performance。

## 8 类配方速查

每条都有「视频出处 → 何时用 → 关键手法」。完整可复制代码在 `references/recipes.md`，按标题检索。

| # | 配方 | 何时用 | 关键手法 |
|---|------|--------|----------|
| 1 | **Pinned Scroll Scene**（钉住+scrub） | Hero 或重点区块：滚动时元素钉在屏内逐步演变 | ScrollTrigger `pin:true` + `scrub:1` + 一条 timeline |
| 2 | **Kinetic Big-Type Reveal**（动态大字逐词/逐行） | 标语揭示：`MAKE IT ONCE.` 逐词蹦出 | SplitText（免费了）或手动 split + `stagger` + mask 上移 |
| 3 | **Blur Section Transition**（缩放+透明+模糊转场） | 上下两屏之间从虚化中浮现 | timeline 同时 tween `scale / autoAlpha / filter:blur()` |
| 4 | **Parallax Layers**（多层视差） | 背景照片比前景慢，营造景深 | 每层一个 ScrollTrigger `scrub` + 不同 `yPercent` |
| 5 | **Glass Card Slide-in**（玻璃浮卡滑入） | 特征卡/仪表盘卡进视口时上滑淡入 | `batch()` 或 trigger-each + `y+autoAlpha`，CSS 给 backdrop-blur |
| 6 | **Number Count-up**（数字滚动） | `12.4%`、`¥345,371` 进视口时从 0 滚到目标 | tween 一个对象的值 + `onUpdate` 写 DOM + `snap` |
| 7 | **SVG Connection Draw**（连线网络图绘制） | "一个平台，多层能力"节点图逐条连线点亮 | DrawSVG（免费了）或 `strokeDasharray/offset` 回退 + 节点 stagger |
| 8 | **Logo Orbit / Marquee**（品牌墙轨道/跑马灯） | 集成方/合作伙伴 logo 绕中心或横向无缝滚动 | 轨道用 `rotation`+反向自转；跑马灯用 `xPercent:-50` 无缝 loop |

## 选型提示

- **"滚动到这里就播一次" vs "随滚动来回走"**：前者用 `toggleActions`（配方 5 思路），后者用 `scrub`（配方 1/4）。别给入场动画上 `scrub`，否则用户往回滚会看到它倒放，廉价。
- **SplitText / DrawSVG 现在是免费插件**（GSAP 3.13+，2025 起随核心免费）。若项目已装 `gsap` 但没注册插件，配方 2/7 都给了**无插件回退**，优先用回退以免增加依赖与包体（弱网敏感）。
- **批量入场**（一长列卡片）用 `ScrollTrigger.batch()`，别给每张卡建一个 trigger——几十个 trigger 会拖慢 refresh。见配方 5。
- **包体**：FlightWoodX 弱网敏感，动效页建议 `import gsap from 'gsap'` 按需引入，ScrollTrigger 等插件在用到的路由内动态 import，别全局打进首屏 chunk。

## 落地流程

1. 确认页面属于"展示类"还是"工具类"（决定动效强度，见上）。
2. 从速查表选 1–N 条配方，去 `references/recipes.md` 取完整代码。
3. 套用三条工程约定（useGSAP scope / matchMedia / transform+opacity）。
4. 自检：把系统设成"减少动态效果"后刷新，页面是否仍**完整可读可用**？弱网下首屏是否没被动效脚本阻塞？
5. 需要某个 GSAP API 的边界行为，查对应 gsap-* skill，不要在本 skill 里猜。
