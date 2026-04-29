import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { LogIn, UserPlus, Sparkles, ArrowRight } from 'lucide-react'

export function AuthPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { login, register, enterGuestMode } = useAuthStore()

  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)

  // 登录表单
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  })

  // 注册表单
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await login(loginData.email, loginData.password)

      if (result.success) {
        toast.push('success', '登录成功！')
        navigate('/')
      } else {
        toast.push('error', result.message)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '登录失败'
      toast.push('error', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await register(
        registerData.username,
        registerData.email,
        registerData.password,
      )

      if (result.success) {
        toast.push('success', '注册成功！')
        navigate('/')
      } else {
        toast.push('error', result.message)
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '注册失败'
      toast.push('error', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGuestMode = () => {
    enterGuestMode()
    navigate('/design')
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setLoginData({ email: '', password: '' })
    setRegisterData({ username: '', email: '', password: '' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-wood-50 via-gray-50 to-wood-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          {/* Logo 和标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-lg bg-wood-200 mb-4 shadow-md">
              <img
                src="/web_logo.png"
                alt="FlightWoodX Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <h1 className="text-3xl font-extrabold mb-2 text-gray-900">
              {isLogin ? '登录' : '注册'} FlightWoodX
            </h1>
            <p className="text-slate-600">
              {isLogin ? '欢迎回来！' : '开启你的创意飞行之旅'}
            </p>
          </div>

          {/* 登录表单 */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  邮箱
                </label>
                <input
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value.trim() })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition focus:border-wood-500 focus:outline-none focus:ring-2 focus:ring-wood-500/20"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  密码
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition focus:border-wood-500 focus:outline-none focus:ring-2 focus:ring-wood-500/20"
                  placeholder="至少6个字符"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-wood-500 hover:bg-wood-600 mt-6"
                disabled={loading || !loginData.email || !loginData.password}
                leftIcon={<LogIn size={18} />}
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </form>
          ) : (
            /* 注册表单 */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  用户名
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={registerData.username}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, username: e.target.value.trim() })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition focus:border-wood-500 focus:outline-none focus:ring-2 focus:ring-wood-500/20"
                  placeholder="至少3个字符"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  邮箱
                </label>
                <input
                  type="email"
                  required
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value.trim() })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition focus:border-wood-500 focus:outline-none focus:ring-2 focus:ring-wood-500/20"
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  密码
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, password: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm transition focus:border-wood-500 focus:outline-none focus:ring-2 focus:ring-wood-500/20"
                  placeholder="至少6个字符"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-wood-500 hover:bg-wood-600 mt-6"
                disabled={
                  loading ||
                  !registerData.username ||
                  !registerData.email ||
                  !registerData.password
                }
                leftIcon={<UserPlus size={18} />}
              >
                {loading ? '注册中...' : '注册'}
              </Button>
            </form>
          )}

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center text-sm">
            <span className="text-slate-600">
              {isLogin ? '还没有账号？' : '已有账号？'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              className="ml-2 font-semibold text-wood-600 hover:text-wood-700"
            >
              {isLogin ? '立即注册' : '去登录'}
            </button>
          </div>

          {/* 分隔线 */}
          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-slate-200" />
            <span className="text-slate-400 text-sm">或</span>
            <hr className="flex-1 border-slate-200" />
          </div>

          {/* 游客模式按钮 */}
          <button
            type="button"
            onClick={handleGuestMode}
            className="w-full py-3 px-6 bg-paper-100 hover:bg-paper-200 border border-wood-300 rounded-lg text-wood-700 font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles size={18} />
            <span>游客模式 — 立即体验</span>
            <ArrowRight size={16} />
          </button>
          {/* subtitle removed */}

          {/* 返回首页 */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              返回首页
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
