import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ModalProps {
  open: boolean
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
}

export function Modal({ open, title, children, footer, onClose }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative mx-auto flex h-full max-w-2xl items-center justify-center px-4">
        <div className="w-full rounded-lg border border-black/10 bg-white shadow-lift dark:border-white/10 dark:bg-slate-950">
          <div className={cn('flex items-center justify-between gap-3 p-4', title ? 'border-b border-black/5 dark:border-white/10' : '')}>
            {title ? <div className="text-base font-extrabold">{title}</div> : <div />}
            <button
              type="button"
              className="touch-target inline-flex items-center justify-center rounded-md hover:bg-wood-50 dark:hover:bg-slate-900"
              aria-label="关闭模态框"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
          <div className="p-4">{children}</div>
          {footer ? <div className="border-t border-black/5 p-4 dark:border-white/10">{footer}</div> : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

