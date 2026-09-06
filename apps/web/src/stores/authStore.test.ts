// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
const api = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), getMe: vi.fn() }))
const drafts = vi.hoisted(() => ({ design: vi.fn(), program: vi.fn() }))
vi.mock('../utils/api', () => api)
vi.mock('./designStore', () => ({ clearDesignStore: drafts.design }))
vi.mock('./programStore', () => ({ clearProgramStore: drafts.program }))
import { useAuthStore } from './authStore'
import { useProfileStore } from './profileStore'

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
  useProfileStore.getState().clear()
})

it('removes the old guest identity when a real account signs in', async () => {
  useAuthStore.getState().enterGuestMode()
  api.login.mockResolvedValue({ success: true, data: { user: { id: 'user-a', username: 'Alice', email: 'a@example.com', role: 'student' }, token: 'token-a' } })
  await useAuthStore.getState().login('a@example.com', 'password')
  expect(localStorage.getItem('fwx_guest_session')).toBeNull()
  useAuthStore.getState().logout()
  await useAuthStore.getState().restoreSession()
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
})

it('verifies persisted sessions and refreshes the server user profile', async () => {
  useAuthStore.setState({ user: { id: 'user-a', username: 'Old', role: 'student' }, token: 'token-a', isAuthenticated: true })
  api.getMe.mockResolvedValue({ success: true, data: { id: 'user-a', username: 'Alice', email: 'a@example.com', role: 'teacher', profile: { displayName: 'Alice Teacher' } } })
  await useAuthStore.getState().restoreSession()
  expect(api.getMe).toHaveBeenCalledOnce()
  expect(useAuthStore.getState().user).toMatchObject({ username: 'Alice', role: 'teacher', nickname: 'Alice Teacher' })
})

it('expires rejected sessions but preserves the unsaved working draft', async () => {
  useAuthStore.setState({ user: { id: 'user-a', username: 'Alice', role: 'student' }, token: 'expired', isAuthenticated: true })
  api.getMe.mockResolvedValue({ success: false, status: 401, error: 'expired' })
  await useAuthStore.getState().restoreSession()
  expect(useAuthStore.getState().token).toBeNull()
  expect(useAuthStore.getState().isAuthenticated).toBe(false)
  expect(drafts.design).not.toHaveBeenCalled()
})

it('does not discard the current session on a transient server failure', async () => {
  useAuthStore.setState({ user: { id: 'user-a', username: 'Alice', role: 'student' }, token: 'token-a', isAuthenticated: true })
  api.getMe.mockResolvedValue({ success: false, status: 503 })
  await useAuthStore.getState().restoreSession()
  expect(useAuthStore.getState().token).toBe('token-a')
})

it('clears private cached profile data on logout and account changes', async () => {
  useAuthStore.setState({ user: { id: 'user-a', username: 'Alice', role: 'student' }, token: 'token-a', isAuthenticated: true })
  useProfileStore.getState().update({ nickname: 'Alice', school: 'Alice school' })
  api.login.mockResolvedValue({ success: true, data: { user: { id: 'user-b', username: 'Bob', role: 'student' }, token: 'token-b' } })
  await useAuthStore.getState().login('b@example.com', 'password')
  expect(useProfileStore.getState().profile.school).toBeUndefined()
  useProfileStore.getState().update({ nickname: 'Bob', school: 'Bob school' })
  useAuthStore.getState().logout()
  expect(useProfileStore.getState().profile.school).toBeUndefined()
})

it('ignores a sign-in response received after logout', async () => {
  let finish!: (value: unknown) => void
  api.login.mockImplementation(() => new Promise(resolve => { finish = resolve }))
  const pending = useAuthStore.getState().login('a@example.com', 'password')
  useAuthStore.getState().logout()
  finish({ success: true, data: { user: { id: 'user-a', username: 'Alice', role: 'student' }, token: 'token-a' } })
  expect((await pending).success).toBe(false)
  expect(useAuthStore.getState().token).toBeNull()
})

it('does not accept a late profile update for a different account', () => {
  useAuthStore.setState({ user: { id: 'user-b', username: 'Bob', role: 'student' }, token: 'token-b', isAuthenticated: true })
  useAuthStore.getState().setUser({ id: 'user-a', username: 'Alice', role: 'student' })
  expect(useAuthStore.getState().user?.id).toBe('user-b')
})

it('does not carry a real account draft into a new guest session', () => {
  useAuthStore.setState({ user: { id: 'user-a', username: 'Alice', role: 'student' }, token: 'token-a', isAuthenticated: true })
  useAuthStore.getState().enterGuestMode()
  expect(drafts.design).toHaveBeenCalledOnce()
  expect(drafts.program).toHaveBeenCalledOnce()
})
