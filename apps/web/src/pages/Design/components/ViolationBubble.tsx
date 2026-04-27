import { useEffect, useState } from 'react'
import type { Violation } from '../../../utils/realtimeChecks'

interface ViolationBubbleProps {
  violation: Violation | null
}

/**
 * Floating bubble that appears near the top-center when a rule is violated.
 * Auto-dismisses after 2.5s. No OK button, no alert.
 */
export function ViolationBubble({ violation }: ViolationBubbleProps) {
  const [visible, setVisible] = useState(false)
  const [current, setCurrent] = useState<Violation | null>(null)

  // From props (click path)
  useEffect(() => {
    if (violation) {
      setCurrent(violation)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 2500)
      return () => clearTimeout(timer)
    }
  }, [violation])

  // From custom event (drag path in ThreeCanvas)
  useEffect(() => {
    const handler = (e: Event) => {
      const v = (e as CustomEvent).detail as Violation
      if (v) {
        setCurrent(v)
        setVisible(true)
        setTimeout(() => setVisible(false), 2500)
      }
    }
    window.addEventListener('fwx-violation', handler)
    return () => window.removeEventListener('fwx-violation', handler)
  }, [])

  if (!visible || !current) return null

  const isError = current.level === 'error'

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div
        className={`px-5 py-3 rounded-lg shadow-lg backdrop-blur-sm text-sm max-w-sm text-center ${
          isError
            ? 'bg-[#E04545]/90 text-white'
            : 'bg-accent-gold/90 text-ink-900'
        }`}
        style={{
          animation: 'fadeInUp 300ms ease-out',
        }}
      >
        <p className="font-medium">{current.message}</p>
        {current.hint && (
          <p className={`text-xs mt-1 ${isError ? 'text-white/80' : 'text-ink-600'}`}>
            {current.hint}
          </p>
        )}
      </div>
    </div>
  )
}
