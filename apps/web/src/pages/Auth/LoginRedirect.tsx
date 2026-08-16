import { useEffect } from 'react'
import { Navigate } from 'react-router'
import { useUIStore } from '../../stores/uiStore'

/**
 * 旧入口 /auth、/login 的接管：登录已改为弹窗，这里把人带回首页并弹出登录框，
 * 避免落到已弃用的全屏登录页，也不留死链。
 */
export function LoginRedirect() {
  const openLoginModal = useUIStore((s) => s.openLoginModal)
  useEffect(() => {
    openLoginModal()
  }, [openLoginModal])
  return <Navigate to="/" replace />
}
