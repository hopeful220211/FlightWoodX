const rateLimit = require('express-rate-limit')

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
  return {
    global: buildLimiter(config, { windowMs: 15 * 60 * 1000, limit: 100 }),
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
