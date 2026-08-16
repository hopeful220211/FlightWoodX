const test = require('node:test')
const assert = require('node:assert/strict')
const customPartController = require('../src/controllers/customPartController')

function partDef(contour) {
  return {
    name: '测试零件',
    category: 'guard',
    geometry: {
      contour,
      holes: [],
      thicknessMm: 2,
      bboxMm: { w: 20, h: 20 },
    },
    sockets: [],
    manufacturability: {
      closed: true,
      minFeatureMm: 2,
      withinBoard: true,
      passed: true,
    },
    flightImpact: { massG: 1 },
    assets: {},
  }
}

function responseRecorder() {
  return {
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
}

test('server validates SVG geometry and never trusts a client passed flag', () => {
  const valid = customPartController._validateDef(partDef('M0 0 L20 0 L20 20 L0 20 Z'))
  assert.equal(valid.ok, true)
  assert.equal(valid.data.manufacturability.closed, true)
  assert.equal(valid.data.manufacturability.passed, false)

  const selfIntersecting = customPartController._validateDef(partDef('M0 0 L20 20 L0 20 L20 0 Z'))
  assert.equal(selfIntersecting.ok, false)
  assert.match(selfIntersecting.message, /几何不合法/)
})

test('create and update return 400 before persistence for invalid SVG geometry', async () => {
  const invalidBody = partDef('M0 0 L20 0 L20 20')

  const createResponse = responseRecorder()
  await customPartController.create({ body: invalidBody, userId: 'user-1' }, createResponse)
  assert.equal(createResponse.statusCode, 400)

  const updateResponse = responseRecorder()
  await customPartController.update({
    body: invalidBody,
    userId: 'user-1',
    params: { id: '507f1f77bcf86cd799439011' },
  }, updateResponse)
  assert.equal(updateResponse.statusCode, 400)
})
