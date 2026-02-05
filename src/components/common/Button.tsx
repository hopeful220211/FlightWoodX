import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '../../utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 变体 */
  variant?: ButtonVariant
  /** 尺寸 */
  size?: ButtonSize
  /** 加载状态 */
  loading?: boolean
  /** 左侧图标 */
  leftIcon?: ReactNode
  /** 右侧图标 */
  rightIcon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading

  const sizeCls =
    size === 'sm'
      ? 'min-h-[44px] px-3 text-sm'
      : size === 'lg'
        ? 'min-h-[48px] px-5 text-base'
        : 'min-h-[44px] px-4 text-sm'

  const variantCls =
    variant === 'secondary'
      ? 'bg-wood-200 text-wood-900 hover:bg-wood-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
      : variant === 'outline'
        ? 'border border-black/10 bg-white text-slate-900 hover:bg-wood-50 dark:border-white/10 dark:bg-slate-950 dark:text-slate-50 dark:hover:bg-slate-900'
        : variant === 'ghost'
          ? 'bg-transparent text-slate-800 hover:bg-wood-100 dark:text-slate-100 dark:hover:bg-slate-900'
          : 'bg-tech-600 text-white hover:bg-tech-700'

  return (
    <button
      type="button"
      className={cn(
        'touch-target inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-sm transition active:translate-y-[1px] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60',
        sizeCls,
        variantCls,
        className,
      )}
      disabled={isDisabled}
      {...rest}
    >
      {leftIcon ? <span className="inline-flex">{leftIcon}</span> : null}
      <span>{loading ? '加载中…' : children}</span>
      {rightIcon ? <span className="inline-flex">{rightIcon}</span> : null}
    </button>
  )
}

