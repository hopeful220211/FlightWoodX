/**
 * EditorLayout — 全屏专注布局，用于设计器 / 积木编程器 / 模拟器。
 * 顶部有一条步骤切换条（设计→编程→仿真），可在三者之间跳转。
 * RFC-011 §4: 编辑器类页面使用全屏专注布局 + 顶部步骤切换条。
 */
import { NavLink, Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft, Pencil, Code2, Play } from 'lucide-react'

const steps = [
  { path: '/design', label: '设计', icon: Pencil },
  { path: '/code', label: '编程', icon: Code2 },
  { path: '/simulator', label: '仿真', icon: Play },
] as const

export function EditorLayout() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* ── Top Bar ── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-sky-100 bg-white px-4">
        {/* 返回项目枢纽（带 id）/ 工作台（无 id），把编辑器拴回 C1 引力枢纽 */}
        <button
          type="button"
          onClick={() => navigate(id ? `/projects/${id}` : '/dashboard')}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-ink-600 hover:bg-sky-50 transition"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">{id ? '返回项目' : '返回工作台'}</span>
        </button>

        {/* Step switcher */}
        <nav className="flex items-center gap-1 rounded-lg bg-sky-50 p-0.5">
          {steps.map((step, i) => {
            const to = id ? `${step.path}/${id}` : step.path
            const isActive = pathname.startsWith(step.path)
            return (
              <NavLink
                key={step.path}
                to={to}
                className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-white text-sky-700 shadow-sm'
                    : 'text-ink-400 hover:text-ink-700'
                }`}
              >
                <step.icon size={14} />
                <span className="hidden sm:inline">{step.label}</span>
                {/* Step number on mobile */}
                <span className="sm:hidden text-xs">{i + 1}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Right placeholder — future: save / share buttons */}
        <div className="w-16" />
      </header>

      {/* ── Editor Canvas ── */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  )
}
