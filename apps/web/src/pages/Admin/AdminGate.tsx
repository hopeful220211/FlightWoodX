import { useState } from 'react'
import { verifyAdminAccessKey } from '../../utils/api'

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm mx-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-800">管理后台</h2>
            <p className="text-sm text-gray-500 mt-1">仅管理员可访问</p>
          </div>

          <div>
            <input
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="请输入管理密码"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '验证中...' : '进入'}
          </button>
        </form>
      </div>
    </div>
  )
}
