import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'

const BANNER_DISMISSED_KEY = 'fwx_guest_banner_dismissed'

export function GuestModeBanner() {
  const user = useAuthStore((s) => s.user)
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(BANNER_DISMISSED_KEY) === 'true',
  )

  if (!user?.isGuest || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(BANNER_DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="bg-sky-50 border-b border-sky-200 px-4 py-2">
      <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
        <p className="text-sm text-sky-800">
          你正在以游客身份使用，设计仅保存在本浏览器中
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded hover:bg-sky-100 text-sky-600 transition-colors"
          aria-label="关闭提示"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
