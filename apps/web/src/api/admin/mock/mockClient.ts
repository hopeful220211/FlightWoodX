/**
 * 后台 mock 客户端（仅 dev 动态加载，不进生产包）。
 * 与 realAdminApi 满足同一 AdminApi 接口。带分页/筛选/模拟延迟。
 */
import type { ApiResponse, Paginated } from '@fwx/shared'
import type { AdminApi, UserListQuery, PartListQuery, PageQuery } from '../types'
import {
  MOCK_USERS,
  mockUserDetail,
  MOCK_COURSES,
  MOCK_PARTS,
  MOCK_KIT,
  MOCK_AUDIT,
  MOCK_OVERVIEW,
} from './fixtures'

const delay = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms))

function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data }
}
function notFound<T>(message = '未找到该记录'): ApiResponse<T> {
  return { success: false, error: { code: 'NOT_FOUND', message } }
}

function paginate<T>(items: T[], page = 1, pageSize = 20): Paginated<T> {
  const p = Math.max(1, page)
  const ps = Math.min(100, Math.max(1, pageSize))
  const start = (p - 1) * ps
  return { items: items.slice(start, start + ps), total: items.length, page: p, pageSize: ps }
}

export const mockAdminApi: AdminApi = {
  async getOverview() {
    await delay()
    return ok(MOCK_OVERVIEW)
  },

  async listUsers(q: UserListQuery = {}) {
    await delay()
    let items = MOCK_USERS
    if (q.role) items = items.filter((u) => u.role === q.role)
    if (q.status) items = items.filter((u) => u.status === q.status)
    if (q.q) {
      const s = q.q.toLowerCase()
      items = items.filter(
        (u) => u.username.toLowerCase().includes(s) || (u.nickname ?? '').includes(q.q!),
      )
    }
    return ok(paginate(items, q.page, q.pageSize))
  },

  async getUser(id) {
    await delay()
    const d = mockUserDetail(id)
    return d ? ok(d) : notFound()
  },

  async patchUser(id, body) {
    await delay()
    const d = mockUserDetail(id)
    if (!d) return notFound()
    return ok({ ...d, ...body })
  },

  async changeUserRole(id, body) {
    await delay()
    const d = mockUserDetail(id)
    if (!d) return notFound()
    return ok({ ...d, role: body.role })
  },

  async resetUserPassword() {
    await delay()
    return ok({ resetLink: 'https://example.com/reset/mock-token-abc123' })
  },

  async verifyTeacher(id) {
    await delay()
    const d = mockUserDetail(id)
    if (!d) return notFound()
    return ok({ ...d, teacherCert: { status: 'verified', reviewedAt: '2026-06-16T00:00:00Z', reviewedBy: 'super-admin' } })
  },

  async importUsers() {
    await delay(500)
    return ok({
      total: 10,
      created: 8,
      skipped: 2,
      errors: [{ row: 4, reason: '用户名重复' }, { row: 9, reason: '邮箱格式错误' }],
    })
  },

  async createGuardian(body) {
    await delay()
    return ok({
      id: `g-${Math.random().toString(36).slice(2, 8)}`,
      guardianUserId: body.guardianUserId,
      studentUserId: body.studentUserId,
      status: 'pending',
    })
  },

  async listCourses() {
    await delay()
    return ok(MOCK_COURSES)
  },

  async listParts(q: PartListQuery = {}) {
    await delay()
    let items = MOCK_PARTS
    if (q.category) items = items.filter((p) => p.category === q.category)
    if (q.reviewStatus) items = items.filter((p) => p.reviewStatus === q.reviewStatus)
    if (q.q) {
      const s = q.q.toLowerCase()
      items = items.filter((p) => p.partNumber.toLowerCase().includes(s) || p.nameZh.includes(q.q!))
    }
    return ok(paginate(items, q.page, q.pageSize))
  },

  async listKit() {
    await delay()
    return ok(MOCK_KIT)
  },

  async listAudit(q: PageQuery = {}) {
    await delay()
    return ok(paginate(MOCK_AUDIT, q.page, q.pageSize))
  },
}
