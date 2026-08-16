/**
 * 后台真实 API 客户端：复用现有 apiFetch（带 JWT / admin-key），
 * 把宽松信封映射成 RFC-014a 的结构化信封 { success, error:{code,message} }。
 * 后端 /api/admin/* 实现后即生效；开发期默认走 mock。
 */
import type { ApiResponse, ApiErrorObject } from '@fwx/shared'
import { getErrorMessage } from '@fwx/shared'
import { apiFetch } from '../../utils/api'
import type { AdminApi, UserListQuery, PartListQuery, PageQuery } from './types'

function qs(params: Record<string, string | number | undefined> = {}): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

async function call<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  const r = await apiFetch<T>(endpoint, options)
  if (r.success) return { success: true, data: r.data as T }
  const e = r.error as unknown
  const error: ApiErrorObject =
    e && typeof e === 'object' && 'code' in e
      ? (e as ApiErrorObject)
      : { code: 'INTERNAL', message: getErrorMessage(typeof e === 'string' ? e : undefined) }
  return { success: false, error }
}

export const realAdminApi: AdminApi = {
  getOverview: () => call('/admin/overview'),

  listUsers: (q: UserListQuery = {}) => call(`/admin/users${qs(q)}`),
  getUser: (id) => call(`/admin/users/${id}`),
  patchUser: (id, body) => call(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  changeUserRole: (id, body) => call(`/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify(body) }),
  resetUserPassword: (id) => call(`/admin/users/${id}/reset-password`, { method: 'POST' }),
  verifyTeacher: (id) => call(`/admin/teachers/${id}/verify`, { method: 'POST' }),
  importUsers: (file) =>
    call('/admin/users/import', {
      method: 'POST',
      body: file,
      headers: { 'Content-Type': file.type || 'text/csv' },
    }),
  createGuardian: (body) => call('/admin/guardians', { method: 'POST', body: JSON.stringify(body) }),

  listCourses: () => call('/admin/courses'),
  listParts: (q: PartListQuery = {}) => call(`/admin/parts${qs(q)}`),
  listKit: () => call('/admin/kit'),
  listAudit: (q: PageQuery = {}) => call(`/admin/audit${qs(q)}`),
}
