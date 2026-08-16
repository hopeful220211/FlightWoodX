import { Outlet, useLocation } from 'react-router'
import { Navbar } from './Navbar'
import { LoginModal } from '../../pages/Auth/components/LoginModal'
import { useHydrate } from '../../hooks/useHydrate'

export function AppLayout() {
  useHydrate()
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* Homepage hero is full-bleed; other pages get top padding for fixed nav */}
      <main className={pathname === '/' ? '' : 'pt-16'}>
        <Outlet />
      </main>
      {/* 登录弹窗：可从任意页面的导航栏 / 拦截唤起 */}
      <LoginModal />
    </div>
  )
}
