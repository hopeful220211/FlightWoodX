const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { randomBytes } = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const mongoose = require('mongoose')
const { createConfig } = require('../src/config/env')
const { createApp } = require('../src/app')
const { putObject } = require('../src/lib/storage')
const DroneDesign = require('../src/models/DroneDesign')

const mongoUri = process.env.FWX_TEST_MONGO_URI
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')

test('real MongoDB: cover cleanup only removes files belonging to the authenticated design', { skip: !mongoUri }, async (t) => {
  assert.match(mongoUri, /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+(\/[^?]*)?$/)
  const dbName = `fwx_cover_test_${randomBytes(8).toString('hex')}`
  await mongoose.connect(mongoUri, { dbName })
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fwx-cover-test-'))
  const config = createConfig({
    NODE_ENV: 'test', JWT_SECRET: randomBytes(32).toString('hex'),
    STORAGE_DRIVER: 'disk', UPLOAD_DIR: uploadDir, RATE_LIMIT_DISABLED: 'true',
    PUBLIC_BASE_URL: 'https://flightwoodx.com',
  })
  const server = createApp(config).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const request = async (route, token, method = 'GET', body) => {
    const response = await fetch(`${base}/api${route}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    return { status: response.status, body: await response.json() }
  }
  const upload = async (id, token) => {
    const response = await fetch(`${base}/api/drone-designs/${id}/cover`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: image,
    })
    assert.equal(response.status, 200)
    return (await response.json()).coverUrl
  }
  const fetchStatus = async url => (await fetch(new URL(new URL(url).pathname, base))).status
  let owner, attacker, victim, victimCover, forged, attackerCover
  try {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()))
    owner = (await request('/auth/register', null, 'POST', {
      username: 'cover-owner', email: 'cover-owner@example.test', password: 'test-password-123',
    })).body
    attacker = (await request('/auth/register', null, 'POST', {
      username: 'cover-other', email: 'cover-other@example.test', password: 'test-password-123',
    })).body
    victim = (await request('/drone-designs', owner.token, 'POST', { name: 'Owned cover', localId: 'victim' })).body.design

    await t.test('deleting a forged design by local ID preserves another user cover', async () => {
      victimCover = await upload(victim.id, owner.token)
      const created = await request('/drone-designs', attacker.token, 'POST', {
        name: 'Forged reference', localId: 'forged-local', coverUrl: victimCover,
      })
      assert.equal(created.status, 201)
      assert.equal((await request('/drone-designs/by-local/forged-local', attacker.token, 'DELETE')).status, 200)
      assert.equal(await fetchStatus(victimCover), 200)
    })

    await t.test('replacement uses the stored design ID and cannot clean a forged previous cover', async () => {
      victimCover = await upload(victim.id, owner.token)
      forged = (await request('/drone-designs', attacker.token, 'POST', {
        name: 'Replacement target', localId: 'replacement', coverUrl: victimCover,
        prefix: `covers/${victim.id}`, ownerId: owner.user.id,
      })).body.design
      attackerCover = await upload(forged.id, attacker.token)
      assert.equal(await fetchStatus(victimCover), 200)
      assert.ok(new URL(attackerCover).pathname.startsWith(`/uploads/covers/${forged.id}/`))
      assert.equal(await fetchStatus(attackerCover), 200)
    })

    await t.test('owned cover replacement and delete still clean the owned files', async () => {
      const replacement = await upload(forged.id, attacker.token)
      assert.notEqual(replacement, attackerCover)
      assert.equal(await fetchStatus(attackerCover), 404)
      assert.equal(await fetchStatus(replacement), 200)
      assert.equal((await request(`/drone-designs/${forged.id}`, attacker.token, 'DELETE')).status, 200)
      assert.equal(await fetchStatus(replacement), 404)
      assert.equal(await fetchStatus(victimCover), 200)
    })

    await t.test('legacy unowned cover files remain when a referencing design is deleted', async () => {
      const legacyUrl = await putObject('covers', image, 'image/png', config)
      const legacyDesign = (await request('/drone-designs', attacker.token, 'POST', {
        name: 'Legacy reference', coverUrl: legacyUrl,
      })).body.design
      assert.equal((await request(`/drone-designs/${legacyDesign.id}`, attacker.token, 'DELETE')).status, 200)
      assert.equal(await fetchStatus(legacyUrl), 200)
    })

    await t.test('failed database save removes only the new upload and keeps the existing cover', async (t) => {
      const previousUrl = await upload(victim.id, owner.token)
      const directory = path.join(uploadDir, 'covers', victim.id)
      const before = await fs.readdir(directory)
      const logs = []
      t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')))
      t.mock.method(DroneDesign.prototype, 'save', async () => { throw new Error('test-only-sensitive-error-details') })
      const response = await fetch(`${base}/api/drone-designs/${victim.id}/cover`, {
        method: 'POST', headers: { Authorization: `Bearer ${owner.token}`, 'Content-Type': 'image/png' }, body: image,
      })
      assert.equal(response.status, 500)
      assert.deepEqual(await fs.readdir(directory), before)
      assert.equal((await DroneDesign.findById(victim.id)).coverUrl, previousUrl)
      assert.equal(await fetchStatus(previousUrl), 200)
      assert.equal(logs.join(' ').includes('test-only-sensitive-error-details'), false)
    })
  } finally {
    await new Promise(resolve => { server.close(resolve) })
    assert.equal(mongoose.connection.name, dbName)
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await fs.rm(uploadDir, { recursive: true, force: true })
  }
})
