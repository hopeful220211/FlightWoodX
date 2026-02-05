import { NavLink } from 'react-router-dom'
import { Menu, X, User, LogOut } from 'lucide-react'
import { useMemo, useState, useRef, useEffect } from 'react'
import { Button } from '../common/Button'
import { useAuthStore } from '../../stores/authStore'
import { AuthModal } from '../features/auth/AuthModal'

const navItems = [
  { to: '/learn', label: '学习中心' },
  { to: '/design', label: '设计工作台' },
  { to: '/gallery', label: '作品展示' },
] as const

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const { isAuthenticated, user, logout } = useAuthStore()

  const linkBase =
    'touch-target inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold transition'

  const getLinkClass = useMemo(
    () =>
      ({ isActive }: { isActive: boolean }) =>
        [
          linkBase,
          isActive
            ? 'bg-wood-200 text-wood-900 dark:bg-slate-800 dark:text-white'
            : 'text-slate-700 hover:bg-wood-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900',
        ].join(' '),
    [],
  )

  // 点击外部关闭用户菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false)
      }
    }
    if (showUserMenu) {
      window.addEventListener('mousedown', handleClickOutside)
      return () => window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    setOpen(false)
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur dark:border-white/10 dark:bg-slate-950/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <NavLink
            to="/"
            className="touch-target inline-flex items-center gap-2 rounded-xl px-2 text-base font-extrabold tracking-tight text-wood-800 dark:text-wood-200"
            onClick={() => setOpen(false)}
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-wood-200 text-wood-900 shadow-sm dark:bg-slate-800 dark:text-white">
              榫
            </span>
            FlightWoodX
          </NavLink>

          {isAuthenticated ? (
            <>
              <nav className="hidden items-center gap-2 md:flex">
                {navItems.map((item) => (
                  <NavLink key={item.to} to={item.to} className={getLinkClass} end>
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="touch-target inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-semibold shadow-sm transition hover:bg-wood-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-wood-200 text-wood-900 dark:bg-slate-800 dark:text-white">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.nickname} className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <User size={14} />
                    )}
                  </div>
                  <span className="hidden md:inline">{user?.nickname || '个人中心'}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-black/10 bg-white shadow-lift dark:border-white/10 dark:bg-slate-900">
                    <NavLink
                      to="/profile"
                      className="block px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-wood-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setShowUserMenu(false)}
                    >
                      个人中心
                    </NavLink>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-wood-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <LogOut size={16} />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setShowAuthModal(true)} className="hidden md:inline-flex">
                登录 / 注册
              </Button>
              <button
                type="button"
                className="touch-target inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-3 text-slate-800 shadow-sm transition hover:bg-wood-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-50 md:hidden"
                aria-label={open ? '关闭菜单' : '打开菜单'}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          )}
        </div>

        {open && !isAuthenticated ? (
          <div className="border-t border-black/5 bg-white dark:border-white/10 dark:bg-slate-950 md:hidden">
            <div className="mx-auto max-w-6xl px-4 py-3">
              <Button className="w-full" onClick={() => setShowAuthModal(true)}>
                登录 / 注册
              </Button>
            </div>
          </div>
        ) : null}
      </header>

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  )
}
