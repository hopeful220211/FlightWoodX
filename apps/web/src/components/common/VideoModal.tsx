import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface VideoModalProps {
  open: boolean
  onClose: () => void
  videoUrl: string
  title?: string
}

export function VideoModal({ open, onClose, videoUrl, title }: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!open && videoRef.current) {
      // 关闭时暂停视频
      videoRef.current.pause()
    }
  }, [open])

  useEffect(() => {
    // ESC 键关闭
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={cn(
          'relative w-full max-w-5xl rounded-lg bg-slate-950 shadow-2xl',
          'animate-in fade-in zoom-in-95 duration-200'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-extrabold text-white">{title || '演示视频'}</h2>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* 视频播放器 */}
        <div className="aspect-video w-full overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            autoPlay
            className="h-full w-full"
            controlsList="nodownload"
          >
            您的浏览器不支持视频播放。
          </video>
        </div>

        {/* 提示文字 */}
        <div className="px-6 py-3 text-center text-sm text-slate-400">
          按 ESC 键或点击外部区域关闭
        </div>
      </div>
    </div>
  )
}
