import type { StorageKey } from '../constants/storageKeys'

export function readStorage<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: StorageKey, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

export function removeStorage(key: StorageKey) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

