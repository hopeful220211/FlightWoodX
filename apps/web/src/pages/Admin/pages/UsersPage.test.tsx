// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { realAdminApi } from '../../../api/admin/realClient'
import { AdminUsersPage } from './UsersPage'

vi.mock('../../../api/admin/realClient', () => ({ realAdminApi: { listUsers: vi.fn() } }))
let container: HTMLDivElement
let root: Root
let client: QueryClient
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.resetAllMocks()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})
afterEach(async () => {
  await act(async () => root.unmount())
  client.clear()
  container.remove()
  vi.unstubAllGlobals()
})
async function render() {
  await act(async () => root.render(<QueryClientProvider client={client}><AdminUsersPage /></QueryClientProvider>))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
}
function button(label: string) { return [...container.querySelectorAll('button')].find(value => value.textContent === label)! }

it('renders real response fields and sends pagination and role filters to the server', async () => {
  vi.mocked(realAdminApi.listUsers).mockImplementation(async (query = {}) => ({ success: true, data: {
    items: [{ id: 'student-a', username: 'student_a', nickname: '绘图学生', role: 'student', status: 'active', grade: '五年级', createdAt: '2026-09-07T00:00:00Z' }],
    total: 21, page: query.page || 1, pageSize: 20,
  } }))
  await render()
  expect(container.textContent).toContain('student_a')
  expect(container.textContent).toContain('五年级')
  expect(button('上一页').disabled).toBe(true)
  await act(async () => button('下一页').click())
  expect(realAdminApi.listUsers).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, role: '', q: '' })
  await act(async () => {
    const select = container.querySelector('select')!
    select.value = 'teacher'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(realAdminApi.listUsers).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, role: 'teacher', q: '' })
})

it('shows permission failure with retry and no fake user list', async () => {
  vi.mocked(realAdminApi.listUsers).mockResolvedValue({ success: false, error: { code: 'FORBIDDEN', message: '无访问权限' } })
  await render()
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('无访问权限')
  expect(container.querySelector('table')).toBeNull()
  await act(async () => button('重试').click())
  expect(realAdminApi.listUsers).toHaveBeenCalledTimes(2)
})
