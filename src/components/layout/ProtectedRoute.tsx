import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    // 如果用户未登录，重定向到首页
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
