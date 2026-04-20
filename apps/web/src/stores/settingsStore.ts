import { create } from 'zustand'
import { STORAGE_KEYS } from '../constants/storageKeys'
import type { AppSettings } from '../types/profile'
import { readStorage, writeStorage } from '../utils/localStorage'

const defaultSettings: AppSettings = { theme: 'light', language: 'zh-CN' }

function applyTheme(theme: AppSettings['theme']) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

export interface SettingsState {
  settings: AppSettings
  setTheme: (theme: AppSettings['theme']) => void
  hydrate: () => void
  clear: () => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  hydrate: () => {
    const s = readStorage<AppSettings>(STORAGE_KEYS.APP_SETTINGS, defaultSettings)
    set({ settings: s })
    applyTheme(s.theme)
  },
  setTheme: (theme) => {
    const next = { ...get().settings, theme }
    set({ settings: next })
    writeStorage(STORAGE_KEYS.APP_SETTINGS, next)
    applyTheme(theme)
  },
  clear: () => {
    set({ settings: defaultSettings })
    writeStorage(STORAGE_KEYS.APP_SETTINGS, defaultSettings)
    applyTheme(defaultSettings.theme)
  },
}))

