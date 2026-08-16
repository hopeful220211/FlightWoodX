import { create } from 'zustand'

/**
 * 全局界面开关。当前只承载「登录弹窗」的开合：
 * Navbar 的「登录」按钮、需登录页面的拦截、旧 /auth · /login 入口都置位这里，
 * 由布局层 <LoginModal /> 统一监听渲染——这样弹窗能从任意页面被唤起。
 */
interface UIState {
  loginModalOpen: boolean
  openLoginModal: () => void
  closeLoginModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  loginModalOpen: false,
  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),
}))
