const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const express = require('express')
const jwt = require('jsonwebtoken')
const { createConfig } = require('../src/config/env')
const { createApp } = require('../src/app')
const { createRateLimits } = require('../src/middleware/rateLimits')

const config = createConfig({ NODE_ENV: 'test', JWT_SECRET: 'rate-budget-test-only-secret' })
async function withServer(app, callback) {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try { await callback(`http://127.0.0.1:${server.address().port}`) }
  finally { server.close(); await once(server, 'close') }
}

test('verified account budgets permit continuous editing and do not share a school IP bucket', async () => {
  const app = express()
  app.use(createRateLimits(config).global)
  app.post('/save', (_req, res) => res.sendStatus(204))
  const tokenA = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, config.jwtSecret, { expiresIn: '1h' })
  const tokenB = jwt.sign({ userId: '507f1f77bcf86cd799439012' }, config.jwtSecret, { expiresIn: '1h' })
  await withServer(app, async base => {
    for (let i = 0; i < 110; i += 1) {
      const saved = await fetch(`${base}/save`, { method: 'POST', headers: { Authorization: `Bearer ${tokenA}` } })
      assert.equal(saved.status, 204)
      assert.equal(saved.headers.get('ratelimit-limit'), '600')
    }
    const other = await fetch(`${base}/save`, { method: 'POST', headers: { Authorization: `Bearer ${tokenB}` } })
    assert.equal(other.headers.get('ratelimit-remaining'), '599')
  })
})

test('a forged signature retains the anonymous IP limit instead of getting an account budget', async () => {
  const app = express()
  app.use(createRateLimits(config).global)
  app.get('/', (_req, res) => res.sendStatus(204))
  const forged = jwt.sign({ userId: '507f1f77bcf86cd799439011' }, 'wrong-test-key')
  await withServer(app, async base => {
    const anonymous = await fetch(base)
    assert.equal(anonymous.headers.get('ratelimit-limit'), '100')
    const invalid = await fetch(base, { headers: { Authorization: `Bearer ${forged}` } })
    assert.equal(invalid.headers.get('ratelimit-limit'), '100')
    assert.equal(invalid.headers.get('ratelimit-remaining'), '98')
  })
})

test('login, registration and password attempts remain limited to twenty per IP', async () => {
  for (const endpoint of ['/api/auth/login', '/api/auth/register', '/api/auth/change-password']) {
    await withServer(createApp(config), async base => {
      if (endpoint === '/api/auth/login') {
        for (let i = 0; i < 25; i += 1) {
          assert.equal((await fetch(`${base}/api/auth/me`)).status, 401)
        }
      }
      for (let i = 0; i < 20; i += 1) {
        const attempt = await fetch(`${base}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        assert.notEqual(attempt.status, 429)
      }
      const blocked = await fetch(`${base}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      assert.equal(blocked.status, 429)
      assert.equal(blocked.headers.get('ratelimit-limit'), '20')
    })
  }
})
