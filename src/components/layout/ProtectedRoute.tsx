import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    // 如果用户未登录，重定向到登录页面
    return <Navigate to="/auth" replace />
  }

  return <Outlet />
}
