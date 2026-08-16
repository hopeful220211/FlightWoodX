const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const User = require('../src/models/User')
const { _authenticateToken } = require('../src/middleware/auth')
const requireAdminAccessKey = require('../src/middleware/adminAccessKey')

const secret = 'test-secret-that-is-long-enough-for-jwt-tests'
const userId = '507f1f77bcf86cd799439011'

function requestForVersion(tokenVersion) {
  return {
    app: { locals: { config: { jwtSecret: secret } } },
    tokenVersion,
  }
}

test('session token is rejected after the stored token version changes', async () => {
  const originalFindById = User.findById
  User.findById = () => ({
    select: (projection) => ({
      lean: async () => {
        assert.equal(projection, '+tokenVersion role username profile.displayName')
        return {
          _id: userId,
          role: 'student',
          tokenVersion: 2,
          username: 'server-user',
          profile: { displayName: '服务端作者' },
        }
      },
    }),
  })

  try {
    const current = jwt.sign({ userId, tokenVersion: 2 }, secret, { algorithm: 'HS256' })
    const request = requestForVersion(2)
    await _authenticateToken(request, current)
    assert.equal(request.userId, userId)
    assert.equal(request.authUser.role, 'student')
    assert.equal(request.authUser.username, 'server-user')
    assert.equal(request.authUser.profile.displayName, '服务端作者')

    const revoked = jwt.sign({ userId, tokenVersion: 1 }, secret, { algorithm: 'HS256' })
    await assert.rejects(_authenticateToken(requestForVersion(1), revoked), /revoked/)
  } finally {
    User.findById = originalFindById
  }
})

function checkAdminKey(expectedKey, providedKey) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  let calledNext = false
  requireAdminAccessKey({
    headers: providedKey === undefined ? {} : { 'x-admin-access-key': providedKey },
    app: { locals: { config: { adminAccessKey: expectedKey } } },
  }, response, () => { calledNext = true })
  return { response, calledNext }
}

test('admin key check fails closed and uses the configured key', () => {
  assert.equal(checkAdminKey('', 'anything').response.statusCode, 503)
  assert.equal(checkAdminKey('configured-admin-key', 'wrong').response.statusCode, 401)
  assert.equal(checkAdminKey('configured-admin-key', 'configured-admin-key').calledNext, true)
})
