import { useEffect, useState } from 'react'
import { Card } from '../../components/common/Card'
import { useToast } from '../../components/common/Toast'
import { useAuthStore } from '../../stores/authStore'
import { Users, Calendar, Clock, Shield } from 'lucide-react'

interface StoredUser {
  username: string
  nickname: string
  password: string
  createdAt: string
  lastLogin?: string
  role?: 'student' | 'teacher' | 'admin'
}

export function AdminPage() {
  const toast = useToast()
  const { user: currentUser } = useAuthStore()
  const [users, setUsers] = useState<StoredUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = () => {
    try {
      // 从 localStorage 读取所有用户
      const stored = localStorage.getItem('flightwoodx-users')
      if (stored) {
        const usersObj = JSON.parse(stored)
        const usersList = Object.values(usersObj) as StoredUser[]
        setUsers(usersList)
      }
    } catch (error: any) {
      toast.push('error', '加载用户列表失败')
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

  // 统计数据
  const totalUsers = users.length
  const studentsCount = users.filter((u) => u.role === 'student').length
  const teachersCount = users.filter((u) => u.role === 'teacher').length
  const adminsCount = users.filter((u) => u.role === 'admin').length

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
                <div className="rounded-xl bg-wood-100 p-3 dark:bg-slate-800">
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
                <div className="rounded-xl bg-green-100 p-3 dark:bg-green-900">
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
                <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-900">
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
                <div className="rounded-xl bg-red-100 p-3 dark:bg-red-900">
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

        {/* 说明信息 */}
        <div className="mt-6 rounded-lg bg-wood-100 p-4 dark:bg-slate-800">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            💡 <strong>提示：</strong>
            当前用户数据存储在本地浏览器中。连接后端 API 后，将显示服务器端的完整用户数据。
          </p>
        </div>
      </div>
    </div>
  )
}
