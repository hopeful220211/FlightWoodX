/**
 * 后台开发期 mock 数据（仅 dev，不进生产包）。用 satisfies 锁定 DTO 形态。
 */
import type {
  AdminUserListItem,
  AdminUserDetail,
  CourseTree,
  PartAdminItem,
  KitItemDTO,
  AuditLogDTO,
  AdminOverview,
} from '@fwx/shared'

const ROLES = ['student', 'teacher', 'parent', 'admin'] as const

function mkUser(i: number): AdminUserListItem {
  const role = ROLES[i % ROLES.length]
  return {
    id: `u${String(i).padStart(3, '0')}`,
    username: `user${i}`,
    nickname: ['小宇', '小雨', '陈老师', '周女士', '林同学', '管理员'][i % 6],
    role,
    status: i % 7 === 0 ? 'disabled' : 'active',
    grade: role === 'student' ? `${3 + (i % 6)} 年级` : undefined,
    school: i % 3 === 0 ? '重庆市渝中区实验小学' : '北京市海淀区中关村二小',
    createdAt: `2026-0${1 + (i % 6)}-${String(1 + (i % 27)).padStart(2, '0')}T08:00:00Z`,
    lastLogin: i % 5 === 0 ? undefined : `2026-06-${String(1 + (i % 15)).padStart(2, '0')}T10:30:00Z`,
  }
}

export const MOCK_USERS: AdminUserListItem[] = Array.from({ length: 23 }, (_, i) => mkUser(i + 1))

export function mockUserDetail(id: string): AdminUserDetail | undefined {
  const base = MOCK_USERS.find((u) => u.id === id)
  if (!base) return undefined
  return {
    ...base,
    email: `${base.username}@example.com`,
    teacherCert:
      base.role === 'teacher'
        ? { status: 'pending', submittedAt: '2026-06-10T09:00:00Z' }
        : { status: 'none' },
    orgId: 'org-001',
    guardians: [],
    stats: { projects: 3, lessonsDone: 8, competitions: 1 },
  }
}

export const MOCK_COURSES: CourseTree[] = [
  {
    id: 'c1', title: '认识榫卯', order: 1, status: 'published', version: 3,
    publishedAt: '2026-05-01T00:00:00Z',
    lessons: [
      { id: 'l1', title: '什么是榫卯', order: 1, duration: 20, status: 'published' },
      { id: 'l2', title: '不用钉子的结构', order: 2, duration: 25, status: 'published' },
      { id: 'l3', title: '动手拼第一个榫卯', order: 3, duration: 30, status: 'draft' },
    ],
  },
  {
    id: 'c2', title: '无人机原理', order: 2, status: 'draft', version: 1,
    lessons: [
      { id: 'l4', title: '它为什么能飞', order: 1, duration: 25, status: 'draft' },
      { id: 'l5', title: '四个螺旋桨的配合', order: 2, duration: 25, status: 'draft' },
    ],
  },
  {
    id: 'c3', title: '设计基础', order: 3, status: 'published', version: 2,
    publishedAt: '2026-05-20T00:00:00Z',
    lessons: [{ id: 'l6', title: '进入设计工作台', order: 1, duration: 20, status: 'published' }],
  },
]

export const MOCK_PARTS: PartAdminItem[] = Array.from({ length: 17 }, (_, i) => {
  const cats = ['mainboard', 'landing', 'guard', 'joint', 'MOTOR', 'PROP']
  const cat = cats[i % cats.length]
  const review = (['approved', 'pending', 'draft', 'rejected'] as const)[i % 4]
  return {
    partNumber: `FW-${cat.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
    category: cat,
    nameZh: `${cat} 零件 ${i + 1}`,
    nameEn: `${cat} part ${i + 1}`,
    glbPath: `/models/${cat}_${i + 1}.glb`,
    thumbnailPath: `/thumbnails/${cat}_${i + 1}.png`,
    snapPointCount: 2 + (i % 4),
    layer: i % 2 === 0 ? 'single' : 'double',
    source: i % 5 === 0 ? 'ugc' : 'official',
    reviewStatus: review,
    version: 1 + (i % 3),
    deprecated: i % 9 === 0,
    bomItemIds: i % 2 === 0 ? ['k1'] : [],
  }
})

export const MOCK_KIT: KitItemDTO[] = [
  { id: 'k1', name: '空心杯电机 8520', type: 'motor', spec: '8.5×20mm 7000KV', priceCents: 1200 },
  { id: 'k2', name: '65mm 三叶桨', type: 'prop', spec: '65mm/1.5mm 轴', priceCents: 300 },
  { id: 'k3', name: 'F4 飞控', type: 'flightController', spec: 'F4 + OSD', priceCents: 8900 },
  { id: 'k4', name: '椴木板 3mm', type: 'wood', spec: '3mm 激光切割椴木', priceCents: 1500 },
]

export const MOCK_AUDIT: AuditLogDTO[] = Array.from({ length: 31 }, (_, i) => ({
  id: `a${i + 1}`,
  actor: ['super-admin', 'operator', 'content-editor', 'reviewer'][i % 4],
  action: ['users:role', 'courses:publish', 'parts:review', 'users:write'][i % 4],
  target: ['user u003', 'course c1', 'part FW-MOT-002', 'user u007'][i % 4],
  at: `2026-06-${String(16 - (i % 16)).padStart(2, '0')}T${String(8 + (i % 12)).padStart(2, '0')}:15:00Z`,
  diffSummary: i % 2 === 0 ? 'role: student → teacher' : undefined,
}))

export const MOCK_OVERVIEW: AdminOverview = {
  users: {
    total: MOCK_USERS.length,
    students: MOCK_USERS.filter((u) => u.role === 'student').length,
    teachers: MOCK_USERS.filter((u) => u.role === 'teacher').length,
    admins: MOCK_USERS.filter((u) => u.role === 'admin').length,
  },
  courses: { total: MOCK_COURSES.length, published: MOCK_COURSES.filter((c) => c.status === 'published').length },
  parts: { total: MOCK_PARTS.length, pendingReview: MOCK_PARTS.filter((p) => p.reviewStatus === 'pending').length },
  recentAudit: MOCK_AUDIT.slice(0, 5),
}
