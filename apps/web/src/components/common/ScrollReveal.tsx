import type { ReactNode, CSSProperties } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'

interface ScrollRevealProps {
  children: ReactNode
  /** Delay in ms for staggered animations */
  delay?: number
  /** Custom className */
  className?: string
  /** Direction of the reveal slide */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  /** Distance in px */
  distance?: number
  /** Duration in ms */
  duration?: number
}

const DIRECTIONS = {
  up: 'translateY',
  down: 'translateY',
  left: 'translateX',
  right: 'translateX',
  none: null,
} as const

export function ScrollReveal({
  children,
  delay = 0,
  className = '',
  direction = 'up',
  distance = 16,
  duration = 600,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal()

  const sign = direction === 'down' || direction === 'right' ? -1 : 1
  const translateFn = DIRECTIONS[direction]

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? 'translate3d(0,0,0)'
      : translateFn
        ? `${translateFn}(${sign * distance}px)`
        : 'none',
    transition: `opacity ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
    willChange: isVisible ? 'auto' : 'opacity, transform',
  }

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  )
}
