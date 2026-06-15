import type { ReactNode } from 'react'
import { cn } from '../../../utils/cn'

interface SectionHeadingProps {
  /** 小标签（eyebrow），前缀带「榫卯」互锁记号 */
  eyebrow?: string
  /** 主标题 */
  title: ReactNode
  /** 标题下的引言 */
  lead?: ReactNode
  /** 对齐方式 */
  align?: 'center' | 'left'
  /** 深色背景上使用浅色文字 */
  tone?: 'dark' | 'light'
  className?: string
}

/**
 * 榫卯互锁记号：木色 + 天蓝两段微微咬合的小色块，
 * 呼应「榫卯结构」——全站统一的签名细节。
 */
function JointMark({ tone }: { tone: 'dark' | 'light' }) {
  return (
    <span className="flex items-center" aria-hidden="true">
      <span className="h-1.5 w-4 rounded-full bg-wood-400" />
      <span className={cn('-ml-1 h-1.5 w-4 rounded-full', tone === 'light' ? 'bg-sky-300' : 'bg-sky-500')} />
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  tone = 'dark',
  className,
}: SectionHeadingProps) {
  const isCenter = align === 'center'

  return (
    <div
      className={cn(
        'flex flex-col',
        isCenter ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <div className={cn('mb-4 flex items-center gap-2.5', isCenter && 'justify-center')}>
          <JointMark tone={tone} />
          <span
            className={cn(
              'text-xs font-semibold tracking-[0.18em]',
              tone === 'light' ? 'text-sky-200' : 'text-sky-600',
            )}
          >
            {eyebrow}
          </span>
        </div>
      )}

      <h2
        className={cn(
          'font-display font-semibold tracking-tight leading-[1.08]',
          'text-[clamp(30px,4.5vw,50px)]',
          tone === 'light' ? 'text-white' : 'text-sky-900',
        )}
      >
        {title}
      </h2>

      {lead && (
        <p
          className={cn(
            'font-display mt-4 text-lg leading-relaxed md:text-xl',
            isCenter && 'max-w-2xl',
            tone === 'light' ? 'text-sky-200' : 'text-sky-700',
          )}
        >
          {lead}
        </p>
      )}
    </div>
  )
}
