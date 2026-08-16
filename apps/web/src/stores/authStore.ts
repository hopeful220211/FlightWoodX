import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { register as apiRegister, login as apiLogin } from '../utils/api'
import { clearDesignStore } from './designStore'
import { clearProgramStore } from './programStore'
import { createGuestSession, getGuestSession, clearGuestSession } from '../utils/guestSession'

export interface User {
  id: string
  username: string
  email?: string
  role: 'student' | 'teacher' | 'admin' | 'guest'
  isGuest?: boolean
  nickname?: string
  avatarUrl?: string
  lastLogin?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message: string }>
  logout: () => void
  setUser: (user: User) => void
  enterGuestMode: () => void
  exitGuestMode: () => void
  restoreSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      register: async (username, email, password) => {
        if (!username || username.length < 3) {
          return { success: false, message: '用户名至少需要3个字符' }
        }
        if (!email || !email.includes('@')) {
          return { success: false, message: '请输入有效的邮箱地址' }
        }
        if (!password || password.length < 6) {
          return { success: false, message: '密码至少需要6个字符' }
        }

        const result = await apiRegister({ username, email, password })

        if (result.success && result.data) {
          const u = result.data.user
          const user: User = {
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role ?? 'student',
            nickname: u.nickname,
            avatarUrl: u.avatarUrl,
            lastLogin: u.lastLogin,
          }
          set({ user, token: result.data.token, isAuthenticated: true })
          return { success: true, message: '注册成功' }
        } else {
          return { success: false, message: result.error || '注册失败' }
        }
      },

      login: async (email, password) => {
        if (!email || !password) {
          return { success: false, message: '请输入邮箱和密码' }
        }

        const result = await apiLogin({ email, password })

        if (result.success && result.data) {
          const u = result.data.user
          const user: User = {
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role ?? 'student',
            nickname: u.nickname,
            avatarUrl: u.avatarUrl,
            lastLogin: u.lastLogin,
          }
          set({ user, token: result.data.token, isAuthenticated: true })
          return { success: true, message: '登录成功' }
        } else {
          return { success: false, message: result.error || '登录失败' }
        }
      },

      logout: () => {
        const user = get().user
        if (user?.isGuest) {
          clearGuestSession()
        }
        set({ user: null, token: null, isAuthenticated: false })
        clearDesignStore()
        clearProgramStore()
      },

      setUser: (user) => set((state) => ({ ...state, user })),

      enterGuestMode: () => {
        const session = createGuestSession()
        const guestUser: User = {
          id: session.guestId,
          username: session.nickname,
          role: 'guest',
          isGuest: true,
        }
        set({ user: guestUser, token: null, isAuthenticated: true })
      },

      exitGuestMode: () => {
        clearGuestSession()
        set({ user: null, token: null, isAuthenticated: false })
        clearDesignStore()
        clearProgramStore()
      },

      restoreSession: () => {
        const state = get()
        // Already authenticated (real user or guest restored by persist)
        if (state.isAuthenticated && state.user) return

        // Try restoring guest session
        const guestSession = getGuestSession()
        if (guestSession) {
          const guestUser: User = {
            id: guestSession.guestId,
            username: guestSession.nickname,
            role: 'guest',
            isGuest: true,
          }
          set({ user: guestUser, token: null, isAuthenticated: true })
        }
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
)
