const test = require('node:test')
const assert = require('node:assert/strict')
const { validateProjectReferences } = require('../src/lib/projectReferences')
const { withStringId } = require('../src/lib/documentResponse')
const projectsRouter = require('../src/routes/projects')

const ownerId = '507f1f77bcf86cd799439011'
const designId = '507f191e810c19729de860ea'
const programId = '507f191e810c19729de860eb'

function ownedModel(expectedId, exists = true) {
  return {
    async exists(filter) {
      assert.deepEqual(filter, { _id: expectedId, ownerId })
      return exists ? { _id: expectedId } : null
    },
  }
}

test('project references must be valid ObjectIds owned by the current user', async () => {
  const valid = await validateProjectReferences(
    { designId, programId },
    ownerId,
    {
      DroneDesign: ownedModel(designId),
      Program: ownedModel(programId),
    },
  )
  assert.deepEqual(valid, { ok: true })

  const invalid = await validateProjectReferences(
    { designId: 'not-an-object-id' },
    ownerId,
    { DroneDesign: ownedModel(designId) },
  )
  assert.deepEqual(invalid, { ok: false, error: 'designId 无效' })

  const foreign = await validateProjectReferences(
    { programId },
    ownerId,
    { Program: ownedModel(programId, false) },
  )
  assert.deepEqual(foreign, { ok: false, error: 'programId 不存在或不属于当前用户' })
})

test('optional references may be cleared and API documents retain _id plus string id', async () => {
  assert.deepEqual(await validateProjectReferences({ designId: null }, ownerId), { ok: true })

  const plain = withStringId({ _id: designId, name: 'Project' })
  assert.deepEqual(plain, { _id: designId, id: designId, name: 'Project' })

  const mongooseLike = withStringId({ toObject: () => ({ _id: programId, name: 'Program' }) })
  assert.deepEqual(mongooseLike, { _id: programId, id: programId, name: 'Program' })
})

function routeHandler(method, path) {
  const layer = projectsRouter.stack.find((item) => item.route?.path === path && item.route.methods[method])
  return layer.route.stack[0].handle
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

test('project create and patch routes reject malformed references before database writes', async () => {
  const createResponse = responseRecorder()
  await routeHandler('post', '/')({
    body: { name: 'Project', designId: 'not-an-object-id' },
    userId: ownerId,
  }, createResponse)
  assert.equal(createResponse.statusCode, 400)
  assert.deepEqual(createResponse.body, { error: 'designId 无效' })

  const patchResponse = responseRecorder()
  await routeHandler('patch', '/:id')({
    body: { programId: 'not-an-object-id' },
    params: { id: 'also-not-read' },
    userId: ownerId,
  }, patchResponse)
  assert.equal(patchResponse.statusCode, 400)
  assert.deepEqual(patchResponse.body, { error: 'programId 无效' })
})
