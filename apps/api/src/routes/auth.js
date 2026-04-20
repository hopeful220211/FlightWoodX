const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const { authenticate } = require('../middleware/auth')
const { requireRole } = require('../middleware/requireRole')

// 公开路由（不需要登录）
router.post('/register', authController.register)
router.post('/login', authController.login)

// 需要认证的路由（需要登录）
router.get('/me', authenticate, authController.getMe)

// 管理员路由
router.get('/users', authenticate, requireRole('admin'), authController.getAllUsers)

module.exports = router
