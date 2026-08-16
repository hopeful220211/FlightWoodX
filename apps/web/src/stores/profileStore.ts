import { create } from 'zustand'
import { STORAGE_KEYS } from '../constants/storageKeys'
import type { UserProfile } from '../types/profile'
import { readStorage, writeStorage } from '../utils/localStorage'

const defaultProfile: UserProfile = { nickname: '小小设计师' }

export interface ProfileState {
  profile: UserProfile
  hydrate: () => void
  update: (patch: Partial<UserProfile>) => void
  clear: () => void
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: defaultProfile,
  hydrate: () => {
    const p = readStorage<UserProfile>(STORAGE_KEYS.USER_PROFILE, defaultProfile)
    set({ profile: p })
  },
  update: (patch) => {
    const next = { ...get().profile, ...patch }
    set({ profile: next })
    writeStorage(STORAGE_KEYS.USER_PROFILE, next)
  },
  clear: () => {
    set({ profile: defaultProfile })
    writeStorage(STORAGE_KEYS.USER_PROFILE, defaultProfile)
  },
}))

