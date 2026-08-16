// 后台管理控制器（RFC-014 §8：新增独立 adminController，停止往 authController 堆）。
// 本轮只做只读聚合 GET /overview；写操作后续轮次接入，且一律经 lib/audit 落痕。
const User = require('../models/User')
const Part = require('../models/Part')
const AuditLog = require('../models/AuditLog')
const { toAuditLogDTO } = require('../lib/audit')

// 概览仪表盘聚合（RFC-014 §5.1）。对齐 @fwx/shared 的 AdminOverview 形态：
//   users:{total,students,teachers,admins} / courses:{total,published}
//   parts:{total,pendingReview} / recentAudit:AuditLogDTO[]
//
// 按根 AGENTS.md 的事实规则，不用占位数据伪装已接入能力：
// - 用户数：从 User 集合真实聚合。
// - 课程数：Course 模型尚未落地（课程仍前端硬编码），如实返回 0，待课程 CMS 轮次接通。
// - 零件数：Part 集合（采购/BOM 视图）真实计数；可拼装零件的"待审核"队列尚未持久化，pendingReview 暂 0。
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

    // 零件（采购/BOM 视图）真实计数；可拼装零件审核队列未落地，暂 0。
    const partsTotal = await Part.countDocuments()

    // 最近审计（倒序 10 条）。
    const recent = await AuditLog.find().sort({ createdAt: -1 }).limit(10)

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
        // Course 模型尚未落地，如实置 0（待课程 CMS 轮次）。
        courses: { total: 0, published: 0 },
        parts: { total: partsTotal, pendingReview: 0 },
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
// status/school 字段 User 模型尚未扩展（属 A-M1 用户模型增量），暂按 'active'/undefined 处理。
function toAdminUserListItem(u) {
  return {
    id: String(u._id),
    username: u.username,
    nickname: u.profile && u.profile.displayName ? u.profile.displayName : undefined,
    role: u.role,
    status: 'active', // User 模型暂无 status 字段，统一 active（停用功能见 A-M1）
    grade: u.profile && u.profile.grade ? u.profile.grade : undefined,
    school: undefined, // User 模型暂无 school 字段（A-M1 增量）
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
      .select('-password')
      .sort({ createdAt: -1 })
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
