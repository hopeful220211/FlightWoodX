import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cn } from '../../utils/cn'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  push: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const push = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`
    const item: ToastItem = { id, type, message }
    setToasts((prev) => [...prev, item])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2200)
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[120] w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'rounded-lg border p-3 text-sm font-semibold shadow-lift backdrop-blur',
              'bg-white/90 text-slate-900 dark:bg-slate-950/80 dark:text-slate-50',
              t.type === 'success'
                ? 'border-success/30'
                : t.type === 'error'
                  ? 'border-error/30'
                  : t.type === 'warning'
                    ? 'border-warning/30'
                    : 'border-tech-400/30',
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

