const jwt = require('jsonwebtoken')

// 验证 Token 的中间件
exports.authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({
        error: '未提供认证令牌'
      })
    }

    // Token 格式: "Bearer xxxxx"
    const token = authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({
        error: '令牌格式错误'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId

    next()

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期，请重新登录' })
    }

    res.status(401).json({
      error: '认证失败'
    })
  }
}
