const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')
const requireAdminAccessKey = require('../middleware/adminAccessKey')
const adminController = require('../controllers/adminController')

// 先确认登录身份和管理员角色，再检查共享密钥，避免给匿名请求提供密钥判断口。
router.use(authenticate)
router.use(requireRole('admin'))
router.use((req, res, next) => req.app.locals.rateLimits.adminKey(req, res, next))
router.use(requireAdminAccessKey)

// POST /api/admin/verify-access-key — pre-check for frontend gate
router.post('/verify-access-key', (_req, res) => {
  res.json({ success: true })
})

// GET /api/admin/overview — 概览仪表盘只读聚合（RFC-014 §5.1 / M1）
router.get('/overview', adminController.getOverview)

// GET /api/admin/users — 强制分页用户列表（RFC-014 §5.2 / M2）
// 替换原 authController.getAllUsers 全量返回，复用 @fwx/shared 的 Paginated 契约。
router.get('/users', adminController.getUsers)
router.get('/audit', adminController.getAudit)

module.exports = router
