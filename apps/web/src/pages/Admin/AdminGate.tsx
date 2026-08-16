import { useState } from 'react'
import { verifyAdminAccessKey } from '../../utils/api'
import { PillButton } from '../../components/common/PillButton'

interface AdminGateProps {
  onVerified: () => void
}

export function AdminGate({ onVerified }: AdminGateProps) {
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim()) return

    setLoading(true)
    setError('')

    const result = await verifyAdminAccessKey(key.trim())

    if (result.success) {
      sessionStorage.setItem('adminAccessKey', key.trim())
      onVerified()
    } else {
      setError('密码错误')
    }

    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-white px-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-card bg-white p-8 shadow-sky-glow">
          <div className="text-center">
            <h2 className="text-h3 font-semibold text-sky-900">管理后台</h2>
            <p className="mt-2 text-body text-sky-500">仅管理员可访问</p>
          </div>

          <div>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="请输入管理密码"
              className="w-full rounded-tag border border-sky-200 px-4 py-2.5 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-spark"
            />
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <PillButton
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full"
          >
            {loading ? '验证中...' : '进入'}
          </PillButton>
        </form>
      </div>
    </div>
  )
}
