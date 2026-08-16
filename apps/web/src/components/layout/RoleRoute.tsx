import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '../../stores/authStore'
import { useUIStore } from '../../stores/uiStore'

interface RoleRouteProps {
  roles: string[]
}

export default function RoleRoute({ roles }: RoleRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  const openLoginModal = useUIStore((s) => s.openLoginModal)

  // 未登录：回首页并弹出登录弹窗
  useEffect(() => {
    if (!isAuthenticated) openLoginModal()
  }, [isAuthenticated, openLoginModal])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
