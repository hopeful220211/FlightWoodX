import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  username: string
  nickname: string
  avatarUrl?: string
}

interface StoredUser {
  username: string
  nickname: string
  password: string
  createdAt: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => { success: boolean; message: string }
  register: (username: string, nickname: string, password: string) => { success: boolean; message: string }
  logout: () => void
  setUser: (user: User) => void
}

// 本地用户数据存储的 key
const USERS_STORAGE_KEY = 'flightwoodx-users'

// 获取所有已注册用户
const getStoredUsers = (): Record<string, StoredUser> => {
  const stored = localStorage.getItem(USERS_STORAGE_KEY)
  return stored ? JSON.parse(stored) : {}
}

// 保存用户数据
const saveUser = (username: string, user: StoredUser) => {
  const users = getStoredUsers()
  users[username] = user
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      register: (username, nickname, password) => {
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

        // 检查用户名是否已存在
        const users = getStoredUsers()
        if (users[username]) {
          return { success: false, message: '用户名已被注册' }
        }

        // 保存新用户
        const newUser: StoredUser = {
          username,
          nickname,
          password, // 注意：实际项目中应该加密存储
          createdAt: new Date().toISOString(),
        }
        saveUser(username, newUser)

        // 自动登录
        const user: User = {
          id: `user_${Date.now()}`,
          username,
          nickname,
        }
        const token = `token_${Date.now()}_${Math.random().toString(16).slice(2)}`
        set({ user, token, isAuthenticated: true })

        return { success: true, message: '注册成功' }
      },

      login: (username, password) => {
        // 验证输入
        if (!username || !password) {
          return { success: false, message: '请输入用户名和密码' }
        }

        // 查找用户
        const users = getStoredUsers()
        const storedUser = users[username]

        if (!storedUser) {
          return { success: false, message: '用户名不存在' }
        }

        if (storedUser.password !== password) {
          return { success: false, message: '密码错误' }
        }

        // 登录成功
        const user: User = {
          id: `user_${Date.now()}`,
          username: storedUser.username,
          nickname: storedUser.nickname,
        }
        const token = `token_${Date.now()}_${Math.random().toString(16).slice(2)}`
        set({ user, token, isAuthenticated: true })

        return { success: true, message: '登录成功' }
      },

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set((state) => ({ ...state, user })),
    }),
    {
      name: 'auth-storage', // localStorage key
    }
  )
)
