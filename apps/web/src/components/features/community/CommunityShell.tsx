import type { ReactNode } from 'react'

/**
 * 社区统一背景基调：暖白纸感底（paper-50，木质调）+ 顶部柔和 sky 渐隐，
 * 让白色卡片在暖底上"浮"起来，整体更高级。社区各页统一包一层。
 */
export function CommunityShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-[100dvh] bg-paper-50">
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
