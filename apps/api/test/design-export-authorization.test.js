const test = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const { createExportCadHandler } = require('../src/controllers/designExportController')

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    headersSent: false,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function archiveRecorder() {
  const files = new Map()
  const archive = new EventEmitter()
  archive.pipe = () => {}
  archive.append = (content, options) => files.set(options.name, String(content))
  archive.file = () => {}
  archive.finalize = async () => {}
  return { archive, files }
}

test('CAD export scopes the server design lookup to the authenticated owner', async () => {
  const queries = []
  const handler = createExportCadHandler({
    DroneDesignModel: {
      findOne(filter) {
        queries.push(filter)
        return { lean: async () => null }
      },
    },
  })
  const response = responseRecorder()

  await handler({
    params: { designId: '507f1f77bcf86cd799439011' },
    userId: 'owner-1',
    authUser: { username: 'owner' },
    app: { locals: { config: { cadPartsDir: '/approved/cad' } } },
    body: {},
  }, response)

  assert.deepEqual(queries, [{
    _id: '507f1f77bcf86cd799439011',
    ownerId: 'owner-1',
  }])
  assert.equal(response.statusCode, 404)
  assert.deepEqual(response.body, { error: '设计不存在' })
})

test('CAD export ignores forged author, parts, stats, and check results', async () => {
  const recorded = archiveRecorder()
  const storedDesign = {
    _id: '507f1f77bcf86cd799439011',
    name: '服务端作品',
    updatedAt: new Date('2026-08-15T00:00:00.000Z'),
    designData: { parts: [{ partId: 'FW-ARM_001' }] },
  }
  const handler = createExportCadHandler({
    DroneDesignModel: {
      findOne: () => ({ lean: async () => storedDesign }),
    },
    createArchive: () => recorded.archive,
    findCadPartFile: async () => null,
  })
  const response = responseRecorder()

  await handler({
    params: { designId: '507f1f77bcf86cd799439011' },
    userId: 'owner-1',
    authUser: {
      username: 'server-user',
      profile: { displayName: '服务端作者' },
    },
    app: { locals: { config: { cadPartsDir: '/approved/cad' } } },
    body: {
      username: '伪造作者',
      design: {
        name: '伪造作品',
        parts: [{ partId: 'FORGED' }],
        stats: { canFly: true },
        checkResults: { status: 'verified' },
      },
    },
  }, response)

  const summary = JSON.parse(recorded.files.get('design-summary.json'))
  assert.equal(summary.designId, storedDesign._id)
  assert.equal(summary.designName, '服务端作品')
  assert.equal(summary.author, '服务端作者')
  assert.deepEqual(summary.parts, [{ partId: 'FW-ARM_001', count: 1 }])
  assert.equal(Object.hasOwn(summary, 'stats'), false)
  assert.equal(Object.hasOwn(summary, 'checkResults'), false)
  assert.match(recorded.files.get('README.txt'), /设计者：服务端作者/)
  assert.doesNotMatch(recorded.files.get('README.txt'), /伪造作者/)
  assert.ok(recorded.files.has('MISSING_PARTS.txt'))
})
