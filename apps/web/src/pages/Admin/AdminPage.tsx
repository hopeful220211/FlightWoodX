import { useEffect, useState } from 'react'
import { Card } from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { getAllUsers } from '../../utils/api'
import type { UserResponse } from '../../utils/api'
import { Users, Calendar, Clock, Shield } from 'lucide-react'

// 扩展用户响应接口，包含管理后台需要的字段
interface AdminUserResponse extends UserResponse {
  role?: 'student' | 'teacher' | 'admin'
  lastLogin?: string
}

export function AdminPage() {
  const toast = useToast()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)

      // 从后端 API 获取所有用户
      const result = await getAllUsers()

      console.log('getAllUsers result:', result)

      if (result.success && result.data) {
        // 后端可能返回 { data: users } 或 { users: users }
        const usersData = Array.isArray(result.data) ? result.data : []
        console.log('Users data:', usersData)
        setUsers(usersData)
      } else {
        const errorMsg = result.error || '加载用户列表失败'
        console.error('API error:', errorMsg)
        setError(errorMsg)
        toast.push('error', errorMsg)
      }
    } catch (error: any) {
      const errorMsg = error.message || '加载用户列表失败'
      console.error('Exception:', error)
      setError(errorMsg)
      toast.push('error', errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    } catch {
      return '未知'
    }
  }

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null
    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg font-semibold text-slate-600 dark:text-slate-400">
          加载中...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-wood-50 via-gray-50 to-wood-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="max-w-md">
          <div className="p-8 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h2 className="mb-2 text-xl font-extrabold text-gray-900 dark:text-white">
              加载失败
            </h2>
            <p className="mb-6 text-slate-600 dark:text-slate-400">
              {error}
            </p>
            <button
              onClick={loadUsers}
              className="rounded-lg bg-wood-500 px-6 py-2 text-white transition hover:bg-wood-600"
            >
              重试
            </button>
          </div>
        </Card>
      </div>
    )
  }

  // 统计数据（安全处理）
  const totalUsers = Array.isArray(users) ? users.length : 0
  const studentsCount = Array.isArray(users) ? users.filter((u) => u?.role === 'student').length : 0
  const teachersCount = Array.isArray(users) ? users.filter((u) => u?.role === 'teacher').length : 0
  const adminsCount = Array.isArray(users) ? users.filter((u) => u?.role === 'admin').length : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-wood-50 via-gray-50 to-wood-100 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-lg bg-wood-200 p-2 dark:bg-slate-800">
              <Shield size={24} className="text-wood-700 dark:text-wood-400" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
              用户管理
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            当前登录：
            <span className="font-semibold">
              {currentUser?.nickname || currentUser?.username}
            </span>
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card hoverable>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-wood-100 p-3 dark:bg-slate-800">
                  <Users className="text-wood-600 dark:text-wood-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {totalUsers}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    总用户数
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card hoverable>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900">
                  <Users className="text-green-600 dark:text-green-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {studentsCount}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    学生用户
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card hoverable>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
                  <Users className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {teachersCount}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    教师用户
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card hoverable>
            <div className="p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-100 p-3 dark:bg-red-900">
                  <Shield className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {adminsCount}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    管理员
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 用户列表 */}
        <Card>
          <div className="p-6">
            <h2 className="mb-4 text-xl font-extrabold text-gray-900 dark:text-white">
              用户列表
            </h2>

            {users.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 text-slate-300 dark:text-slate-700" size={48} />
                <p className="text-slate-600 dark:text-slate-400">暂无注册用户</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        用户名
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        昵称
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        角色
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        注册时间
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">
                        最后登录
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr
                        key={user.username}
                        className="border-b border-slate-100 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {user.username}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {user.nickname}
                        </td>
                        <td className="px-4 py-3">
                          {user.role ? (
                            <span
                              className={`
                              inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                              ${
                                user.role === 'admin'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : ''
                              }
                              ${
                                user.role === 'teacher'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                  : ''
                              }
                              ${
                                user.role === 'student'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : ''
                              }
                            `}
                            >
                              {user.role === 'admin' && '管理员'}
                              {user.role === 'teacher' && '教师'}
                              {user.role === 'student' && '学生'}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400 dark:text-slate-600">
                              未设置
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                          {user.lastLogin ? (
                            <div className="flex items-center gap-2">
                              <Clock size={14} />
                              {formatDateTime(user.lastLogin)}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">
                              从未登录
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
