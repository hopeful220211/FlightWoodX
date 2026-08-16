// @ts-check
const crypto = require('crypto')

module.exports = function requireAdminAccessKey(req, res, next) {
  const providedKey = req.headers['x-admin-access-key']
  const expectedKey = req.app.locals.config.adminAccessKey

  if (!expectedKey) {
    console.error('[SECURITY] ADMIN_ACCESS_KEY not configured')
    return res.status(503).json({ error: 'Admin access not configured' })
  }

  const provided = Buffer.from(typeof providedKey === 'string' ? providedKey : '')
  const expected = Buffer.from(expectedKey)
  const valid = provided.length === expected.length && crypto.timingSafeEqual(provided, expected)
  if (!valid) return res.status(401).json({ error: 'Invalid admin access key' })
  return next()
}
