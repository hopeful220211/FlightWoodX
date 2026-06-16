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

// 可选鉴权（RFC-016 / RFC-017 社区公域）：
// 无 Authorization → 直接放行（游客可浏览）；有 token → 校验，
// 校验失败返回 401（不静默当游客，避免过期登录态显示错误的 likedByMe）。
exports.optionalAuthenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return next()

  const token = authHeader.split(' ')[1]
  if (!token) return next()

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = decoded.userId
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期，请重新登录' })
    }
    return res.status(401).json({ error: '无效的令牌' })
  }
}

// 可选认证：带了有效 token 就填 req.userId，没带或无效则按未登录继续（不报错）。
// 用于公开但"登录后能多看一点"的接口，如赛事详情的 isRegistered。
exports.optionalAuth = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (authHeader) {
      const token = authHeader.split(' ')[1]
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.userId
      }
    }
  } catch (_) {
    // 无效 token 一律按未登录处理，不阻断公开接口
  }
  next()
}
