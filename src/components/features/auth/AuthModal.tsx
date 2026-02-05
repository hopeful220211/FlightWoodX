import { useState } from 'react'
import { Button } from '../../common/Button'
import { Modal } from '../../common/Modal'
import { useAuthStore } from '../../../stores/authStore'
import { useToast } from '../../common/Toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { login } = useAuthStore()
  const toast = useToast()

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleSendCode = () => {
    if (!phone || phone.length !== 11) {
      toast.push('error', '请输入正确的11位手机号')
      return
    }
    setCodeSent(true)
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    toast.push('success', '验证码已发送（模拟）')
  }

  const handleLogin = () => {
    if (!phone || phone.length !== 11) {
      toast.push('error', '请输入正确的11位手机号')
      return
    }
    if (!code || code.length !== 6) {
      toast.push('error', '请输入6位验证码')
      return
    }

    // 模拟登录：生成模拟用户数据和 token
    const mockUser = {
      id: `user_${Date.now()}`,
      phone,
      nickname: `用户${phone.slice(-4)}`,
      avatarUrl: undefined,
    }
    const mockToken = `token_${Date.now()}_${Math.random().toString(16).slice(2)}`

    login(mockUser, mockToken)
    toast.push('success', '登录成功')
    onClose()
    setPhone('')
    setCode('')
    setCodeSent(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="登录 / 注册">
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            手机号
          </label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="请输入11位手机号"
              className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
              maxLength={11}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendCode}
              disabled={countdown > 0 || !phone || phone.length !== 11}
            >
              {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
            </Button>
          </div>
        </div>

        {codeSent && (
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              验证码
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="请输入6位验证码"
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-800 dark:text-white"
              maxLength={6}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              验证码为：123456（模拟环境）
            </p>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleLogin}
          disabled={!phone || phone.length !== 11 || !code || code.length !== 6}
        >
          登录 / 注册
        </Button>
      </div>
    </Modal>
  )
}
