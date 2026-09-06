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
const Project = require('../src/models/Project')

const mongoUri = process.env.FWX_TEST_MONGO_URI
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64')

test('real MongoDB: project cover writes and cleanup are scoped to the authenticated stored project', { skip: !mongoUri }, async (t) => {
  assert.match(mongoUri, /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+(\/[^?]*)?$/)
  const dbName = `fwx_project_cover_${randomBytes(8).toString('hex')}`
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fwx-project-cover-'))
  await mongoose.connect(mongoUri, { dbName })
  const config = createConfig({ NODE_ENV: 'test', JWT_SECRET: randomBytes(32).toString('hex'), STORAGE_DRIVER: 'disk', UPLOAD_DIR: uploadDir, RATE_LIMIT_DISABLED: 'true', PUBLIC_BASE_URL: 'https://flightwoodx.com' })
  const server = createApp(config).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}`
  const request = async (route, token, method = 'GET', body) => {
    const response = await fetch(`${base}/api${route}`, { method, headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, body: body ? JSON.stringify(body) : undefined })
    return { status: response.status, body: await response.json() }
  }
  const uploadResponse = (id, token) => fetch(`${base}/api/projects/${id}/cover`, {
    method: 'POST', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'image/png' }, body: image,
  })
  const upload = async (id, token) => { const response = await uploadResponse(id, token); assert.equal(response.status, 200); return (await response.json()).coverUrl }
  const status = async url => (await fetch(new URL(new URL(url).pathname, base))).status
  try {
    await Promise.all(Object.values(mongoose.models).map(model => model.init()))
    const owner = (await request('/auth/register', null, 'POST', { username: 'project-owner', email: 'project-owner@example.test', password: 'fixture-test-password-123' })).body
    const attacker = (await request('/auth/register', null, 'POST', { username: 'project-other', email: 'project-other@example.test', password: 'fixture-test-password-123' })).body
    const victim = (await request('/projects', owner.token, 'POST', { name: 'Owned project' })).body.project

    await t.test('authentication and ownership are checked before storage writes', async () => {
      assert.equal((await uploadResponse(victim.id)).status, 401)
      assert.equal((await uploadResponse(victim.id, attacker.token)).status, 404)
      assert.deepEqual(await fs.readdir(uploadDir), [])
    })

    await t.test('new uploads use a server-owned project namespace and replacement cleans only its predecessor', async () => {
      const first = await upload(victim.id, owner.token)
      const second = await upload(victim.id, owner.token)
      assert.equal(await status(first), 404)
      assert.equal(await status(second), 200)
      assert.ok(new URL(second).pathname.startsWith(`/uploads/covers/projects/${victim.id}/`))
    })

    await t.test('forged cross-owner and cross-resource cover references survive replacement and project deletion', async () => {
      const victimCover = await upload(victim.id, owner.token)
      const droneCover = await putObject(`covers/${new mongoose.Types.ObjectId()}`, image, 'image/png', config)
      for (const protectedUrl of [victimCover, droneCover]) {
        const forged = (await request('/projects', attacker.token, 'POST', { name: 'Forged reference', coverUrl: protectedUrl, prefix: `covers/projects/${victim.id}`, ownerId: owner.user.id })).body.project
        const attackerCover = await upload(forged.id, attacker.token)
        assert.equal(await status(protectedUrl), 200)
        assert.equal((await request(`/projects/${forged.id}`, attacker.token, 'DELETE')).status, 200)
        assert.equal(await status(attackerCover), 404)
        assert.equal(await status(protectedUrl), 200)
        const deleteOnly = (await request('/projects', attacker.token, 'POST', { name: 'Delete forged', coverUrl: protectedUrl })).body.project
        assert.equal((await request(`/projects/${deleteOnly.id}`, attacker.token, 'DELETE')).status, 200)
        assert.equal(await status(protectedUrl), 200)
      }
    })

    await t.test('legacy shared cover files remain recoverable', async () => {
      const legacy = await putObject('covers', image, 'image/png', config)
      const project = (await request('/projects', owner.token, 'POST', { name: 'Legacy', coverUrl: legacy })).body.project
      assert.equal((await request(`/projects/${project.id}`, owner.token, 'DELETE')).status, 200)
      assert.equal(await status(legacy), 200)
    })

    await t.test('failed save cleans the newly uploaded file, preserves the previous URL and hides sensitive error details', async (t) => {
      const previous = await upload(victim.id, owner.token)
      const before = await fs.readdir(uploadDir, { recursive: true })
      const logs = []
      t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')))
      t.mock.method(Project.prototype, 'save', async () => { throw new Error('sensitive-fixture-storage-authorization') })
      const response = await uploadResponse(victim.id, owner.token)
      assert.equal(response.status, 500)
      assert.equal(JSON.stringify(await response.json()).includes('sensitive-fixture-storage-authorization'), false)
      assert.equal(logs.join(' ').includes('sensitive-fixture-storage-authorization'), false)
      assert.deepEqual(await fs.readdir(uploadDir, { recursive: true }), before)
      assert.equal((await Project.findById(victim.id)).coverUrl, previous)
      assert.equal(await status(previous), 200)
    })
  } finally {
    await new Promise(resolve => { server.close(resolve) })
    assert.equal(mongoose.connection.name, dbName)
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
    await fs.rm(uploadDir, { recursive: true, force: true })
  }
})
