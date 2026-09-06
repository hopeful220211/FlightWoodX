// 后台管理控制器（RFC-014 §8：新增独立 adminController，停止往 authController 堆）。
// 本轮只做只读聚合 GET /overview；写操作后续轮次接入，且一律经 lib/audit 落痕。
const User = require('../models/User')
const Part = require('../models/Part')
const AuditLog = require('../models/AuditLog')
const { toAuditLogDTO } = require('../lib/audit')
const { AdminAuditQuerySchema } = require('@fwx/shared/runtime-cjs')

// 概览仪表盘聚合（RFC-014 §5.1）。对齐 @fwx/shared 的 AdminOverview 形态：
//   users:{total,students,teachers,admins} / courses:{total,published}
//   parts:{total,pendingReview} / recentAudit:AuditLogDTO[]
//
// 按根 AGENTS.md 的事实规则，不用占位数据伪装已接入能力：
// - 用户数：从 User 集合真实聚合。
// - 课程数与待审核数：尚无正式来源，返回 null，不把未接入冒充零记录。
// - 零件数：Part 集合（采购/BOM 视图）真实计数，并非官方拼装 registry 数量。
// - 最近审计：从 AuditLog 真实读取（上一轮已落地）。
exports.getOverview = async (req, res) => {
  try {
    // 用户按角色聚合（一次查询）。
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ])
    const byRole = roleCounts.reduce((acc, r) => {
      acc[r._id] = r.count
      return acc
    }, {})
    const usersTotal = roleCounts.reduce((sum, r) => sum + r.count, 0)

    // 零件（采购/BOM 视图）真实计数。
    const partsTotal = await Part.countDocuments()

    // 最近审计（倒序 10 条）。
    const recent = await AuditLog.find().select('actor action target createdAt').sort({ createdAt: -1, _id: -1 }).limit(10)

    // 信封对齐 RFC-014a 的 ApiResponse：{ success, data }。
    // 前端 realClient 期待 res.data = AdminOverview；裸对象会被 apiFetch 的
    // `result.users` 启发式误取，故必须包一层 data。
    res.json({
      success: true,
      data: {
        users: {
          total: usersTotal,
          students: byRole.student || 0,
          teachers: byRole.teacher || 0,
          admins: byRole.admin || 0,
        },
        courses: { total: null, published: null },
        parts: { total: partsTotal, pendingReview: null },
        recentAudit: recent.map(toAuditLogDTO),
      },
    })
  } catch (error) {
    console.error('AdminOverview error:', error)
    res.status(500).json({
      error: '获取后台概览失败',
      details: req.app.locals.config.nodeEnv === 'development' ? error.message : undefined,
    })
  }
}

// User 文档 → @fwx/shared 的 AdminUserListItem（列表脱敏：不含 email/明文密码）。
// 不返回未落地的停用状态，也不包含 email、学号或密码等无关个人字段。
function toAdminUserListItem(u) {
  return {
    id: String(u._id),
    username: u.username,
    nickname: u.profile && u.profile.displayName ? u.profile.displayName : undefined,
    role: u.role,
    grade: u.profile && u.profile.grade ? u.profile.grade : undefined,
    school: u.profile && u.profile.school ? u.profile.school : undefined,
    createdAt: (u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt)).toISOString(),
    lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : undefined,
  }
}

// GET /api/admin/users — 强制分页用户列表（RFC-014 §5.2）。
// 替换 authController.getAllUsers 的全量返回；复用 @fwx/shared 的 Paginated/PaginationQuery 契约
// （page 默认 1、pageSize 默认 20、上限 100）。返回 ApiResponse<Paginated<AdminUserListItem>>。
exports.getUsers = async (req, res) => {
  try {
    // 分页参数：套用 PaginationQuerySchema 的约定边界（不重复定义类型，仅应用 bound）。
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20))

    // 过滤：role 精确、q 模糊（用户名/昵称）。status 待 User 模型扩展后再支持。
    const filter = {}
    if (req.query.role) filter.role = req.query.role
    if (req.query.q) {
      const rx = new RegExp(String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filter.$or = [{ username: rx }, { 'profile.displayName': rx }]
    }

    const total = await User.countDocuments(filter)
    const docs = await User.find(filter)
      .select('username role profile.displayName profile.grade profile.school createdAt lastLogin')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)

    res.json({
      success: true,
      data: {
        items: docs.map(toAdminUserListItem),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('AdminUsers error:', error)
    res.status(500).json({
      error: '获取用户列表失败',
      details: req.app.locals.config.nodeEnv === 'development' ? error.message : undefined,
    })
  }
}

// GET /api/admin/audit — only existing persisted audit metadata, never before/after payloads.
exports.getAudit = async (req, res) => {
  const parsed = AdminAuditQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ error: '审计分页参数无效：每页最多 100 条，页码最多 10000' })
  const { page, pageSize } = parsed.data
  try {
    const [total, documents] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.find().select('actor action target createdAt')
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize),
    ])
    return res.json({ success: true, data: { items: documents.map(toAuditLogDTO), total, page, pageSize } })
  } catch (error) {
    console.error('AdminAudit read failed:', error.message)
    return res.status(500).json({ error: '获取审计日志失败，请重试' })
  }
}
