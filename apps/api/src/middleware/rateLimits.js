const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')

function disabledLimiter(_req, _res, next) {
  next()
}

function buildLimiter(config, options) {
  if (!config.rateLimitEnabled) return disabledLimiter
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  })
}

function createRateLimits(config) {
  const accountIds = new WeakMap()
  function accountId(req) {
    if (accountIds.has(req)) return accountIds.get(req)
    let id = null
    const [scheme, token, extra] = (req.headers.authorization || '').split(' ')
    if (scheme === 'Bearer' && token && !extra) {
      try {
        const claims = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
        if (claims && typeof claims.userId === 'string' && /^[a-f0-9]{24}$/i.test(claims.userId)) id = claims.userId
      } catch { /* Invalid/expired signatures retain the anonymous IP budget. */ }
    }
    accountIds.set(req, id)
    return id
  }
  return {
    // A 2-second editor save uses up to 450 requests per 15 minutes. Account
    // budgets also avoid sharing one school's IP allowance. This signature-only
    // bucket is NOT authorization: routes still verify the user/tokenVersion.
    global: buildLimiter(config, {
      windowMs: 15 * 60 * 1000,
      limit: (req) => accountId(req) ? 600 : 100,
      keyGenerator: (req) => {
        const id = accountId(req)
        return id ? `user:${id}` : `ip:${rateLimit.ipKeyGenerator(req.ip)}`
      },
      message: { error: '请求过于频繁，请稍后再试' },
    }),
    auth: buildLimiter(config, {
      windowMs: 15 * 60 * 1000,
      limit: 20,
      message: { error: '请求过于频繁，请稍后再试' },
    }),
    adminKey: buildLimiter(config, {
      windowMs: 15 * 60 * 1000,
      limit: 10,
      message: { error: '请求过于频繁，请稍后再试' },
    }),
    coverUpload: buildLimiter(config, {
      windowMs: 60 * 60 * 1000,
      limit: config.storage.coverUploadsPerHour,
      keyGenerator: (req) => `user:${String(req.userId)}`,
      message: { error: '封面上传过于频繁，请稍后再试' },
    }),
    sts: buildLimiter(config, {
      windowMs: 60 * 60 * 1000,
      limit: config.storage.stsRequestsPerHour,
      keyGenerator: (req) => `user:${String(req.userId)}`,
      message: { error: '上传凭证申请过于频繁，请稍后再试' },
    }),
  }
}

module.exports = { createRateLimits }
