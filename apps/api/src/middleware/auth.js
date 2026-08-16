const jwt = require('jsonwebtoken')
const User = require('../models/User')

function bearerToken(req) {
  const authHeader = req.headers.authorization
  if (!authHeader) return null
  const [scheme, token, extra] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token || extra) return undefined
  return token
}

async function authenticateToken(req, token) {
  const decoded = jwt.verify(token, req.app.locals.config.jwtSecret, { algorithms: ['HS256'] })
  if (!decoded || typeof decoded.userId !== 'string') throw new jwt.JsonWebTokenError('invalid token subject')

  const user = await User.findById(decoded.userId)
    .select('+tokenVersion role username profile.displayName')
    .lean()
  if (!user) throw new jwt.JsonWebTokenError('user no longer exists')
  const tokenVersion = Number.isInteger(decoded.tokenVersion) ? decoded.tokenVersion : 0
  if ((user.tokenVersion || 0) !== tokenVersion) throw new jwt.JsonWebTokenError('token has been revoked')

  req.userId = decoded.userId
  req.authUser = user
}

function authError(error, res, next) {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: '令牌已过期，请重新登录' })
  }
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: '无效的令牌' })
  }
  return next(error)
}

exports.authenticate = async (req, res, next) => {
  const token = bearerToken(req)
  if (token === null) return res.status(401).json({ error: '未提供认证令牌' })
  if (token === undefined) return res.status(401).json({ error: '令牌格式错误' })
  try {
    await authenticateToken(req, token)
    return next()
  } catch (error) {
    return authError(error, res, next)
  }
}

// 无 token 时按游客；带 token 时必须有效，避免过期登录态被静默降级。
exports.optionalAuthenticate = async (req, res, next) => {
  const token = bearerToken(req)
  if (token === null) return next()
  if (token === undefined) return res.status(401).json({ error: '令牌格式错误' })
  try {
    await authenticateToken(req, token)
    return next()
  } catch (error) {
    return authError(error, res, next)
  }
}

// 公开接口的宽松可选认证：无效 token 仍按未登录继续。
exports.optionalAuth = async (req, _res, next) => {
  const token = bearerToken(req)
  if (!token) return next()
  try {
    await authenticateToken(req, token)
  } catch (_) {
    // 公开响应不因无效登录态失败。
  }
  return next()
}

exports._authenticateToken = authenticateToken
