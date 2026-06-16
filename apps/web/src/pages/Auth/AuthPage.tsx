import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { CloudLayer } from '../Home/components/CloudLayer'
import { LogIn, UserPlus, Sparkles, ArrowRight } from 'lucide-react'

// 品牌：木质无人机飞上蓝天。页面浮在 sky-hero 天空 + 漂移云朵里（与首页一致），
// 主操作走品牌蓝；唯一的暖木色留给 logo 与「游客模式」——蓝=飞，木=造。
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
        navigate('/dashboard')
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
        navigate('/dashboard')
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
    navigate('/dashboard')
  }

  const switchMode = () => {
    setIsLogin(!isLogin)
    setLoginData({ email: '', password: '' })
    setRegisterData({ username: '', email: '', password: '' })
  }

  const inputCls =
    'w-full rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm text-sky-900 placeholder:text-sky-400/70 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200/70'
  const labelCls = 'mb-2 block text-sm font-semibold text-sky-800'

  return (
    <div className="relative min-h-screen overflow-hidden bg-sky-hero">
      {/* 品牌氛围：缓慢漂移的云（与首页同款，prefers-reduced-motion 自动停） */}
      <CloudLayer />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white/95 p-8 shadow-[0_28px_70px_-24px_rgba(23,74,126,0.42)] ring-1 ring-white/70 backdrop-blur-sm sm:p-10">
          {/* Logo 和标题 —— 木牌 logo 是页面唯一的暖木签名 */}
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-wood-100 to-wood-200 ring-1 ring-wood-300/50 mb-4 shadow-sm">
              <img
                src="/web_logo.png"
                alt="FlightWoodX Logo"
                className="h-11 w-11 object-contain"
              />
            </div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-sky-900">
              {isLogin ? '登录' : '注册'} FlightWoodX
            </h1>
            <p className="mt-2 text-sm text-sky-600/90">
              {isLogin ? '欢迎回来，继续你的飞行之旅' : '从一块木头，到一架会飞的无人机'}
            </p>
          </div>

          {/* 登录表单 */}
          {isLogin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className={labelCls}>邮箱</label>
                <input
                  type="email"
                  required
                  value={loginData.email}
                  onChange={(e) =>
                    setLoginData({ ...loginData, email: e.target.value.trim() })
                  }
                  className={inputCls}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={labelCls}>密码</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={loginData.password}
                  onChange={(e) =>
                    setLoginData({ ...loginData, password: e.target.value })
                  }
                  className={inputCls}
                  placeholder="至少 6 个字符"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-6"
                disabled={loading || !loginData.email || !loginData.password}
                leftIcon={<LogIn size={18} />}
              >
                {loading ? '登录中…' : '登录'}
              </Button>
            </form>
          ) : (
            /* 注册表单 */
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className={labelCls}>用户名</label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={registerData.username}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, username: e.target.value.trim() })
                  }
                  className={inputCls}
                  placeholder="至少 3 个字符"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className={labelCls}>邮箱</label>
                <input
                  type="email"
                  required
                  value={registerData.email}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, email: e.target.value.trim() })
                  }
                  className={inputCls}
                  placeholder="your@email.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className={labelCls}>密码</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={registerData.password}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, password: e.target.value })
                  }
                  className={inputCls}
                  placeholder="至少 6 个字符"
                  autoComplete="new-password"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full mt-6"
                disabled={
                  loading ||
                  !registerData.username ||
                  !registerData.email ||
                  !registerData.password
                }
                leftIcon={<UserPlus size={18} />}
              >
                {loading ? '注册中…' : '注册'}
              </Button>
            </form>
          )}

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center text-sm">
            <span className="text-sky-600/80">
              {isLogin ? '还没有账号？' : '已有账号？'}
            </span>
            <button
              type="button"
              onClick={switchMode}
              className="ml-2 font-semibold text-sky-600 transition hover:text-sky-700"
            >
              {isLogin ? '立即注册' : '去登录'}
            </button>
          </div>

          {/* 分隔线 */}
          <div className="my-6 flex items-center gap-3">
            <hr className="flex-1 border-sky-100" />
            <span className="text-sky-400 text-xs">或</span>
            <hr className="flex-1 border-sky-100" />
          </div>

          {/* 游客模式：可亲的「先玩玩」——唯一另一处暖木色 */}
          <button
            type="button"
            onClick={handleGuestMode}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-wood-200 bg-wood-50/70 px-6 py-3 font-medium text-wood-700 transition hover:bg-wood-100 active:scale-[0.99]"
          >
            <Sparkles size={18} className="text-wood-500" />
            <span>游客模式 — 立即体验</span>
            <ArrowRight size={16} />
          </button>

          {/* 返回首页 */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-sm text-sky-500/80 transition hover:text-sky-700"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
