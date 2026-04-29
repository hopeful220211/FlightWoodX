import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from './Navbar'
import { GuestModeBanner } from './GuestModeBanner'
import { useHydrate } from '../../hooks/useHydrate'
import { HelpCircle } from 'lucide-react'
import { Tooltip } from '../common/Tooltip'

export function AppLayout() {
  useHydrate()
  const { pathname } = useLocation()
  const hideHelpBubble = pathname === '/' || pathname.startsWith('/design')

  return (
    <div className="min-h-screen">
      <Navbar />
      {/* GuestModeBanner removed — too intrusive */}
      <main className={pathname === '/' ? '' : 'pt-[72px]'}>
        <Outlet />
      </main>
      {!hideHelpBubble && (
        <Tooltip content="帮助与反馈">
          <button
            type="button"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-wood-800 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
            aria-label="帮助与反馈"
            onClick={() => {
              window.alert('帮助与反馈：即将推出')
            }}
          >
            <HelpCircle size={28} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}

