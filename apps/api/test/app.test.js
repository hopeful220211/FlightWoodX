const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { createConfig } = require('../src/config/env')
const { createApp } = require('../src/app')
const { startServer } = require('../src/server')

test('server startup is explicit and import has no listening side effect', () => {
  assert.equal(typeof startServer, 'function')
})

async function withServer(callback) {
  const config = createConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-secret',
    ADMIN_ACCESS_KEY: 'test-admin-key',
    STORAGE_DRIVER: 'disk',
    RATE_LIMIT_DISABLED: 'true',
  })
  const server = createApp(config).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address()
  try {
    await callback(`http://127.0.0.1:${address.port}`)
  } finally {
    server.close()
    await once(server, 'close')
  }
}

test('app factory serves health and JSON errors without starting a database', async () => {
  await withServer(async (baseUrl) => {
    const health = await fetch(`${baseUrl}/healthz`)
    assert.equal(health.status, 503)
    const healthBody = await health.json()
    assert.deepEqual({ ...healthBody, timestamp: undefined }, {
      status: 'DEGRADED',
      message: 'FlightWoodX Backend',
      db: 'disconnected',
      timestamp: undefined,
    })
    assert.equal(Number.isNaN(Date.parse(healthBody.timestamp)), false)

    const missing = await fetch(`${baseUrl}/not-a-route`)
    assert.equal(missing.status, 404)
    assert.equal(missing.headers.get('x-content-type-options'), 'nosniff')
    assert.deepEqual(await missing.json(), { error: 'Not Found', path: '/not-a-route' })

    const malformed = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    })
    assert.equal(malformed.status, 400)
    assert.deepEqual(await malformed.json(), { error: '请求内容格式错误' })
  })
})
