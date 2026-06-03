import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
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
    </div>
  )
}
