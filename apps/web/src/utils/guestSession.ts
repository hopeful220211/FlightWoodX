/**
 * Guest session management for offline/no-backend mode.
 * Stores guest identity in localStorage so it persists across page reloads.
 */

const GUEST_KEY = 'fwx_guest_session'
const GUEST_NICKNAME = '小飞行员'

interface GuestSession {
  isGuest: true
  guestId: string
  nickname: string
  createdAt: string
}

export function createGuestSession(): GuestSession {
  const session: GuestSession = {
    isGuest: true,
    guestId: `guest-${Date.now()}`,
    nickname: GUEST_NICKNAME,
    createdAt: new Date().toISOString(),
  }
  localStorage.setItem(GUEST_KEY, JSON.stringify(session))
  return session
}

export function getGuestSession(): GuestSession | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GuestSession
  } catch {
    return null
  }
}

export function clearGuestSession(): void {
  localStorage.removeItem(GUEST_KEY)
}

export function isGuestSession(): boolean {
  return getGuestSession() !== null
}

export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__fwx_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}
