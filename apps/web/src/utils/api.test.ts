// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiFetch, deleteDroneDesignByLocal, getMe, getProject, login, putDroneDesign, updateProfile } from './api'

beforeEach(() => { localStorage.clear(); sessionStorage.clear() })
afterEach(() => vi.unstubAllGlobals())

it('accepts a successful empty response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
  expect(await apiFetch('/drone-designs/example', { method: 'DELETE' })).toMatchObject({ success: true, status: 204 })
})

it('keeps HTTP status and provides a readable gateway error for non-JSON responses', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 })))
  const result = await apiFetch('/drone-designs')
  expect(result).toMatchObject({ success: false, status: 502 })
  expect(result.error).not.toMatch(/Unexpected|<html>/)
})

it('does not report an application-level failure as success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, error: '保存失败' })))
  expect(await apiFetch('/drone-designs')).toMatchObject({ success: false, error: '保存失败' })
})

it('preserves falsy data returned by the service', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: 0 })))
  expect((await apiFetch('/me')).data).toBe(0)
})

it('does not claim a project was loaded when a successful HTTP response has no project data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
  const result = await getProject('missing-payload')
  expect(result.success).toBe(false)
  expect(result.status).toBe(204)
  expect(result.error).toBeTruthy()
  expect(result.data).toBeUndefined()
})

it('preserves the original failure without casting an error envelope to project data', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ error: '作品不存在' }, { status: 404 })))
  expect(await getProject('not-found')).toMatchObject({ success: false, status: 404, error: '作品不存在' })
})

it('unwraps the real current-user and profile envelopes without discarding the login token', async () => {
  const user = { id: 'account-a', username: 'Alice', nickname: 'Alice', role: 'student', profile: { school: 'Test school' } }
  vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(Response.json({ user, token: 'login-token' }))))
  expect((await getMe()).data).toEqual(user)
  expect((await updateProfile({ profile: { school: 'Test school' } })).data).toEqual(user)
  expect((await login({ email: 'a@example.com', password: 'password' })).data).toEqual({ user, token: 'login-token' })
})

it('queues all design writers and cancels waiting writes after the account changes', async () => {
  localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'token-a' } }))
  let finish!: (value: Response) => void
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetchMock)
  const designData = { id: 'draft', name: 'Draft', updatedAt: new Date().toISOString(), schemaVersion: 1 as const, parts: [], buildMode: 'guided' as const, currentStep: 'HUB' as const, stepReached: 0 }
  const first = putDroneDesign({ localId: 'draft', name: 'Older', designData })
  const latest = putDroneDesign({ localId: 'draft', name: 'Latest', designData })
  await Promise.resolve()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'token-b' } }))
  finish(Response.json({ design: { id: 'server-draft' } }))
  await first
  expect((await latest).success).toBe(false)
  expect(fetchMock).toHaveBeenCalledTimes(1)
})

it('deletes only after pending saves finish so an older upsert cannot resurrect the work', async () => {
  localStorage.setItem('auth-storage', JSON.stringify({ state: { token: 'token-a' } }))
  let finish!: (value: Response) => void
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    .mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  const designData = { id: 'draft', name: 'Draft', updatedAt: new Date().toISOString(), schemaVersion: 1 as const, parts: [], buildMode: 'guided' as const, currentStep: 'HUB' as const, stepReached: 0 }
  const saving = putDroneDesign({ localId: 'draft', name: 'Draft', designData })
  await Promise.resolve()
  const deleting = deleteDroneDesignByLocal('draft')
  expect(fetchMock).toHaveBeenCalledTimes(1)
  finish(Response.json({ design: { id: 'server-draft' } }))
  await Promise.all([saving, deleting])
  expect(fetchMock.mock.calls[1][1].method).toBe('DELETE')
})

it('preserves write ordering when the same account receives a new token', async () => {
  const session = (token: string) => JSON.stringify({ state: { token, user: { id: 'same-account' } } })
  localStorage.setItem('auth-storage', session('rotation-old-token'))
  let finish!: (value: Response) => void
  const fetchMock = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    .mockResolvedValue(Response.json({ design: { id: 'server-draft' } }))
  vi.stubGlobal('fetch', fetchMock)
  const designData = { id: 'rotation-draft', name: 'Draft', updatedAt: new Date().toISOString(), schemaVersion: 1 as const, parts: [], buildMode: 'guided' as const, currentStep: 'HUB' as const, stepReached: 0 }
  const first = putDroneDesign({ localId: 'rotation-draft', name: 'Older', designData })
  await Promise.resolve()
  localStorage.setItem('auth-storage', session('rotation-new-token'))
  const latest = putDroneDesign({ localId: 'rotation-draft', name: 'Latest', designData })
  await Promise.resolve()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  finish(Response.json({ design: { id: 'server-draft' } }))
  await Promise.all([first, latest])
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer rotation-new-token')
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).name).toBe('Latest')
})
