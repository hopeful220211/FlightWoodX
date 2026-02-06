import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { register as apiRegister, login as apiLogin } from '../utils/api'

export interface User {
  id: string
  username: string
  nickname: string
  avatarUrl?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (username: string, nickname: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  setUser: (user: User) => void
}

// 注意：本地存储功能已移除，现在使用后端 API
// 管理后台页面会直接从 localStorage 读取测试数据（如果有）

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      register: async (username, nickname, password) => {
        // 验证输入
        if (!username || username.length < 3) {
          return { success: false, message: '用户名至少需要3个字符' }
        }
        if (!nickname || nickname.length < 2) {
          return { success: false, message: '昵称至少需要2个字符' }
        }
        if (!password || password.length < 6) {
          return { success: false, message: '密码至少需要6个字符' }
        }

        // 调用后端 API 注册
        const result = await apiRegister({ username, nickname, password })

        if (result.success && result.data) {
          // 保存用户信息和 token
          const user: User = {
            id: result.data.user.id,
            username: result.data.user.username,
            nickname: result.data.user.nickname,
            avatarUrl: result.data.user.avatarUrl,
          }
          set({ user, token: result.data.token, isAuthenticated: true })
          return { success: true, message: '注册成功' }
        } else {
          return { success: false, message: result.error || '注册失败' }
        }
      },

      login: async (username, password) => {
        // 验证输入
        if (!username || !password) {
          return { success: false, message: '请输入用户名和密码' }
        }

        // 调用后端 API 登录
        const result = await apiLogin({ username, password })

        if (result.success && result.data) {
          // 保存用户信息和 token
          const user: User = {
            id: result.data.user.id,
            username: result.data.user.username,
            nickname: result.data.user.nickname,
            avatarUrl: result.data.user.avatarUrl,
          }
          set({ user, token: result.data.token, isAuthenticated: true })
          return { success: true, message: '登录成功' }
        } else {
          return { success: false, message: result.error || '登录失败' }
        }
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set((state) => ({ ...state, user })),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
