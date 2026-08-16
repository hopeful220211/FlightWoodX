const User = require('../models/User')

// Role-based access control middleware
// Must be used AFTER authenticate middleware
exports.requireRole = (...roles) => {
  return async (req, res, next) => {
    try {
      const user = req.authUser || await User.findById(req.userId).select('role')

      if (!user) {
        return res.status(404).json({ error: '用户不存在' })
      }

      if (!roles.includes(user.role)) {
        return res.status(403).json({ error: '权限不足' })
      }

      req.userRole = user.role
      next()
    } catch (error) {
      res.status(500).json({ error: '权限验证失败' })
    }
  }
}
