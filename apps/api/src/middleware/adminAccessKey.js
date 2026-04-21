// TEMPORARY: admin access key guard.
// To be removed after role-based admin UI is implemented (Q3 2026).
// Tracking: docs/risk-log.md

module.exports = function requireAdminAccessKey(req, res, next) {
  const providedKey = req.headers['x-admin-access-key']
  const expectedKey = process.env.ADMIN_ACCESS_KEY

  if (!expectedKey) {
    console.error('[SECURITY] ADMIN_ACCESS_KEY not configured')
    return res.status(503).json({ error: 'Admin access not configured' })
  }

  if (providedKey !== expectedKey) {
    return res.status(401).json({ error: 'Invalid admin access key' })
  }

  next()
}
