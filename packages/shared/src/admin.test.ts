import { expect, it } from 'vitest'
import { AdminAuditQuerySchema, AdminAuditListSchema, AdminOverviewSchema, AdminUserListSchema } from './admin'

it('represents unavailable administration metrics as unknown instead of zero', () => {
  const parsed = AdminOverviewSchema.parse({ users: { total: 1, students: 1, teachers: 0, admins: 0 }, courses: { total: null, published: null }, parts: { total: 0, pendingReview: null }, recentAudit: [] })
  expect(parsed.courses.total).toBeNull()
  expect(parsed.parts.pendingReview).toBeNull()
  expect(AdminOverviewSchema.safeParse({ ...parsed, users: { ...parsed.users, total: -1 } }).success).toBe(false)
})

it('bounds audit pagination and rejects malformed responses', () => {
  expect(AdminAuditQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  for (const query of [{ page: 10001 }, { page: -1 }, { pageSize: 101 }, { page: '1abc' }]) expect(AdminAuditQuerySchema.safeParse(query).success).toBe(false)
  expect(AdminAuditListSchema.safeParse({ items: [{ id: 'audit', at: 'bad-date' }], total: 1, page: 1, pageSize: 20 }).success).toBe(false)
})

it('does not require a fabricated account status or expose extra user fields', () => {
  const parsed = AdminUserListSchema.parse({ items: [{ id: 'user', username: 'student', role: 'student', school: 'Example school', createdAt: '2026-09-07T00:00:00Z', email: 'private@example.test' }], total: 1, page: 1, pageSize: 20 })
  expect(parsed.items[0]?.school).toBe('Example school')
  expect(parsed.items[0]).not.toHaveProperty('status')
  expect(parsed.items[0]).not.toHaveProperty('email')
})
