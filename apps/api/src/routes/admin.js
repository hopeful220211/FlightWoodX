const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')
const requireAdminAccessKey = require('../middleware/adminAccessKey')
const adminController = require('../controllers/adminController')

// All admin routes: access key first, then JWT auth, then role check
router.use(requireAdminAccessKey)
router.use(authenticate)
router.use(requireRole('admin'))

// POST /api/admin/verify-access-key — pre-check for frontend gate
router.post('/verify-access-key', (_req, res) => {
  res.json({ success: true })
})

// GET /api/admin/overview — 概览仪表盘只读聚合（RFC-014 §5.1 / M1）
router.get('/overview', adminController.getOverview)

// GET /api/admin/users — 强制分页用户列表（RFC-014 §5.2 / M2）
// 替换原 authController.getAllUsers 全量返回，复用 @fwx/shared 的 Paginated 契约。
router.get('/users', adminController.getUsers)

module.exports = router
