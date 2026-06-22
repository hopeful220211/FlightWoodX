import type { ReactNode } from 'react'

/**
 * 社区统一背景基调 + 字体作用域。
 * - 暖白纸感底（paper-50，木质调）+ 顶部柔和 sky 渐隐，让白色卡片在暖底上"浮"起来。
 * - 在此注入 Space Grotesk（React 19 会把 <link> 自动提升到 <head>），并定义两个**作用域**工具类，
 *   全社区共用，不触碰任何全局样式：
 *     .fwx-display —— 标题/数字/英文（拉丁与数字走 Grotesk，中文自动回落苹方/MiSans）
 *     .fwx-mono    —— 等宽技术标注（详情页 TechLabel 用，等宽数字对齐）
 * 社区各页统一包一层。
 */
export function CommunityShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] bg-paper-50">
      {/* React 19 凭 precedence 把样式表提升到 <head> 并去重；只新增字体，不改全局基调 */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
        precedence="default"
      />
      {/* 作用域字体工具类（仅在社区树内可用） */}
      <style>{`
        .fwx-display{font-family:'Space Grotesk','MiSans','PingFang SC',system-ui,sans-serif;}
        .fwx-mono{font-family:ui-monospace,'SFMono-Regular',Menlo,Consolas,monospace;font-variant-numeric:tabular-nums;}
      `}</style>

      {/* 顶部 sky 微光晕 + 木纹暖角，纯装饰、不挡交互 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-b from-sky-100/50 via-sky-50/30 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[22rem] w-[22rem] rounded-full bg-paper-200/30 blur-3xl"
      />
      <div className="relative">{children}</div>
    </div>
  )
}
