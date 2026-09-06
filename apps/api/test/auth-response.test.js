const test = require('node:test')
const assert = require('node:assert/strict')
const User = require('../src/models/User')
const auth = require('../src/controllers/authController')

const userId = '507f1f77bcf86cd799439011'
const config = { nodeEnv: 'test', jwtSecret: 'auth-response-regression-secret' }
const request = (body = {}) => ({ body, userId, app: { locals: { config } } })
const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this },
  json(body) { this.body = body; return this },
})

test('login, session reload and profile update return the same safe user shape', async () => {
  const user = new User({
    _id: userId, username: 'designer', email: 'designer@example.com', password: 'private-hash',
    role: 'student', profile: { displayName: '设计同学', avatar: '/avatar.png', school: '测试学校', grade: '三年级' },
    tokenVersion: 4,
  })
  user.comparePassword = async () => true
  user.save = async () => user
  const original = { findOne: User.findOne, findById: User.findById, findByIdAndUpdate: User.findByIdAndUpdate }
  User.findOne = () => ({ select: async () => user })
  User.findById = () => ({ select: async () => user })
  User.findByIdAndUpdate = () => ({ select: async () => user })
  try {
    for (const [handler, body] of [
      [auth.login, { email: 'designer@example.com', password: 'secure-password' }],
      [auth.getMe, {}],
      [auth.updateProfile, { profile: { displayName: '设计同学' } }],
    ]) {
      const res = response()
      await handler(request(body), res)
      assert.equal(res.statusCode, 200)
      const payload = JSON.parse(JSON.stringify(res.body.user))
      assert.equal(payload.id, userId)
      assert.equal(payload.nickname, '设计同学')
      assert.equal(payload.avatarUrl, '/avatar.png')
      assert.equal(payload.profile.grade, '三年级')
      assert.equal(payload.profile.school, '测试学校')
      assert.equal(payload.role, 'student')
      assert.equal(typeof payload.createdAt, 'string')
      assert.equal(payload.password, undefined)
      assert.equal(payload.tokenVersion, undefined)
    }
  } finally { Object.assign(User, original) }
})

test('registration validates names and email before querying MongoDB', async () => {
  const findOne = User.findOne
  let queries = 0
  User.findOne = async () => { queries += 1; return null }
  try {
    for (const body of [
      { username: 'ab', email: 'valid@example.com', password: 'password' },
      { username: 'valid', email: 'not-an-email', password: 'password' },
      { username: 'valid', email: 'valid@example.com', password: '密'.repeat(25) },
    ]) {
      const res = response()
      await auth.register(request(body), res)
      assert.equal(res.statusCode, 400)
    }
    assert.equal(queries, 0)
  } finally { User.findOne = findOne }
})

test('registration normalizes whitespace and email case before reporting duplicates', async () => {
  const findOne = User.findOne
  let query
  User.findOne = async (filter) => {
    query = filter
    return { username: 'existing', email: 'existing@example.com' }
  }
  try {
    const res = response()
    await auth.register(request({ username: ' another ', email: ' Existing@Example.COM ', password: 'password' }), res)
    assert.equal(res.statusCode, 400)
    assert.deepEqual(query, { $or: [{ email: 'existing@example.com' }, { username: 'another' }] })
    assert.equal(res.body.error, '邮箱已被注册')
  } finally { User.findOne = findOne }
})

test('profile updates preserve fields not present in the request and reject malformed input', async () => {
  const findByIdAndUpdate = User.findByIdAndUpdate
  let update
  User.findByIdAndUpdate = (_id, values) => {
    update = values
    return { select: async () => new User({ _id: userId, username: 'designer', email: 'designer@example.com', password: 'private-hash' }) }
  }
  try {
    const res = response()
    await auth.updateProfile(request({ profile: { displayName: '  新昵称  ' }, role: 'admin' }), res)
    assert.equal(res.statusCode, 200)
    assert.deepEqual(update, { $set: { 'profile.displayName': '新昵称' } })
    const school = response()
    await auth.updateProfile(request({ profile: { school: '  测试学校  ' } }), school)
    assert.equal(school.statusCode, 200)
    assert.deepEqual(update, { $set: { 'profile.school': '测试学校' } })
    for (const profile of ['invalid', { school: '校'.repeat(101) }, { school: 123 }]) {
      const invalid = response()
      await auth.updateProfile(request({ profile }), invalid)
      assert.equal(invalid.statusCode, 400)
    }
  } finally { User.findByIdAndUpdate = findByIdAndUpdate }
})
