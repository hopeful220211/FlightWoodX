const test = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const { randomBytes } = require('node:crypto')
const mongoose = require('mongoose')
const { createApp } = require('../src/app')
const { createConfig } = require('../src/config/env')
const User = require('../src/models/User')
const AuditLog = require('../src/models/AuditLog')

const mongoUri = process.env.FWX_TEST_MONGO_URI
test('admin read APIs use real records, protected pagination and safe fields', { skip: !mongoUri }, async (t) => {
  assert.match(mongoUri, /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+(\/[^?]*)?$/)
  const dbName = `fwx_admin_read_${randomBytes(8).toString('hex')}`
  const key = randomBytes(24).toString('hex')
  await mongoose.connect(mongoUri, { dbName })
  const server = createApp(createConfig({ NODE_ENV: 'test', JWT_SECRET: randomBytes(48).toString('hex'), ADMIN_ACCESS_KEY: key, RATE_LIMIT_DISABLED: 'true' })).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const base = `http://127.0.0.1:${server.address().port}/api`
  const send = async (url, token, adminKey, body) => {
    const response = await fetch(base + url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(adminKey ? { 'X-Admin-Access-Key': adminKey } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status: response.status, body: await response.json() }
  }
  try {
    const student = (await send('/auth/register', undefined, undefined, { username: 'student', email: 'student@example.test', password: randomBytes(16).toString('hex') })).body
    const admin = (await send('/auth/register', undefined, undefined, { username: 'administrator', email: 'admin@example.test', password: randomBytes(16).toString('hex') })).body
    await User.updateOne({ _id: admin.user.id }, { $set: { role: 'admin' } })
    await User.updateOne({ _id: student.user.id }, { $set: { profile: { school: 'Test school', grade: '五年级', studentId: 'private-student-id' } } })
    await AuditLog.create([1, 2, 3].map(index => ({ _id: new mongoose.Types.ObjectId(`00000000000000000000000${index}`), actor: 'system', action: 'users:role', target: `user#${index}`, before: { password: 'sensitive-before' }, after: { email: 'sensitive-after@example.test' }, diffSummary: 'sensitive-summary', createdAt: new Date('2026-09-07T00:00:00Z') })))
    await t.test('audit requires login, admin role and the access key', async () => {
      assert.equal((await send('/admin/audit')).status, 401)
      assert.equal((await send('/admin/audit', student.token, key)).status, 403)
      assert.equal((await send('/admin/audit', admin.token)).status, 401)
    })
    await t.test('audit pages have stable ordering and never include payload or freeform summaries', async () => {
      const first = await send('/admin/audit?page=1&pageSize=2', admin.token, key)
      assert.equal(first.status, 200)
      assert.equal(first.body.data.total, 3)
      assert.deepEqual(first.body.data.items.map(item => item.target), ['user#3', 'user#2'])
      const second = await send('/admin/audit?page=2&pageSize=2', admin.token, key)
      assert.deepEqual(second.body.data.items.map(item => item.target), ['user#1'])
      assert.doesNotMatch(JSON.stringify(first.body), /sensitive|before|after|password|email/)
      for (const query of ['page=10001', 'page=-1', 'pageSize=101', 'page=1abc']) assert.equal((await send(`/admin/audit?${query}`, admin.token, key)).status, 400)
    })
    await t.test('overview distinguishes unavailable metrics and excludes sensitive audit payloads', async () => {
      const overview = await send('/admin/overview', admin.token, key)
      assert.equal(overview.body.data.courses.total, null)
      assert.equal(overview.body.data.parts.pendingReview, null)
      assert.doesNotMatch(JSON.stringify(overview.body), /sensitive|before|after|password|email/)
    })
    await t.test('student list returns school without identity or fabricated account status', async () => {
      const users = await send('/admin/users?role=student', admin.token, key)
      assert.equal(users.body.data.items[0].school, 'Test school')
      assert.equal(users.body.data.items[0].status, undefined)
      assert.doesNotMatch(JSON.stringify(users.body), /private-student-id|password|email|tokenVersion/)
    })
  } finally {
    server.close()
    await once(server, 'close')
    assert.equal(mongoose.connection.name, dbName)
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  }
})
