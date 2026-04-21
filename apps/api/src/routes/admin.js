const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')
const requireAdminAccessKey = require('../middleware/adminAccessKey')
const authController = require('../controllers/authController')

// All admin routes: access key first, then JWT auth, then role check
router.use(requireAdminAccessKey)
router.use(authenticate)
router.use(requireRole('admin'))

// POST /api/admin/verify-access-key — pre-check for frontend gate
router.post('/verify-access-key', (_req, res) => {
  res.json({ success: true })
})

// GET /api/admin/users — list all users (moved from /api/auth/users)
router.get('/users', authController.getAllUsers)

module.exports = router
