const test = require('node:test')
const assert = require('node:assert/strict')
const Project = require('../src/models/Project')
const CommunityPost = require('../src/models/CommunityPost')
const DroneDesign = require('../src/models/DroneDesign')
const Collection = require('../src/models/Collection')
const CollectionItem = require('../src/models/CollectionItem')
const forksRouter = require('../src/routes/forks')
const communityRouter = require('../src/routes/community')
const collectionsRouter = require('../src/routes/collections')

const userId = '507f1f77bcf86cd799439011'
const otherUserId = '507f1f77bcf86cd799439012'
const sourcePostId = '507f191e810c19729de860ea'
const maliciousPostId = '507f191e810c19729de860eb'
const projectId = '507f191e810c19729de860ec'
const collectionId = '507f191e810c19729de860ed'

function routeHandler(router, method, path) {
  const layer = router.stack.find((item) => item.route?.path === path && item.route.methods[method])
  return layer.route.stack[layer.route.stack.length - 1].handle
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

function queryResult(value) {
  return {
    select() { return this },
    populate() { return this },
    async lean() { return value },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) },
  }
}

test('fork provenance is server-only and unique per owner and source post', () => {
  assert.equal(Project.schema.path('forkFromPostId').options.select, false)
  const provenanceIndex = Project.schema.indexes().find(([fields]) =>
    fields.ownerId === 1 && fields.forkFromPostId === 1)
  assert.ok(provenanceIndex)
  assert.equal(provenanceIndex[1].unique, true)
})

test('repeating the same fork returns the existing project without incrementing reuseCount', async () => {
  const originalPostFind = CommunityPost.findById
  const originalProjectFind = Project.findOne
  const originalProjectFindById = Project.findById
  const originalReuseUpdate = DroneDesign.updateOne
  let reuseUpdates = 0

  CommunityPost.findById = () => queryResult({ _id: sourcePostId, projectId })
  Project.findOne = () => queryResult({ _id: projectId })
  Project.findById = () => { throw new Error('source bundle must not be read for an idempotent retry') }
  DroneDesign.updateOne = async () => { reuseUpdates += 1 }

  try {
    const response = responseRecorder()
    await routeHandler(forksRouter, 'post', '/posts/:id/fork')({
      params: { id: sourcePostId },
      userId,
    }, response)

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.body, { projectId, alreadyForked: true })
    assert.equal(reuseUpdates, 0)
  } finally {
    CommunityPost.findById = originalPostFind
    Project.findOne = originalProjectFind
    Project.findById = originalProjectFindById
    DroneDesign.updateOne = originalReuseUpdate
  }
})

async function publishWithProject(project, claimedForkFromPostId) {
  const originalProjectFind = Project.findOne
  const originalPostFind = CommunityPost.findOne
  const originalPostExists = CommunityPost.exists
  const originalPostCreate = CommunityPost.create
  let createdPayload

  Project.findOne = () => queryResult(project)
  CommunityPost.findOne = async () => null
  CommunityPost.exists = async ({ _id }) => ({ _id })
  CommunityPost.create = async (payload) => {
    createdPayload = payload
    return { _id: sourcePostId, ...payload }
  }

  try {
    const response = responseRecorder()
    await routeHandler(communityRouter, 'post', '/posts')({
      body: { projectId, forkFromPostId: claimedForkFromPostId },
      userId,
    }, response)
    assert.equal(response.statusCode, 201)
    return createdPayload
  } finally {
    Project.findOne = originalProjectFind
    CommunityPost.findOne = originalPostFind
    CommunityPost.exists = originalPostExists
    CommunityPost.create = originalPostCreate
  }
}

test('community publish ignores client fork claims and uses only server provenance', async () => {
  const ordinaryProject = {
    _id: projectId,
    ownerId: userId,
    name: '普通项目',
    visibility: 'public',
  }
  const forged = await publishWithProject(ordinaryProject, maliciousPostId)
  assert.equal(forged.forkFromId, undefined)

  const serverFork = await publishWithProject({
    ...ordinaryProject,
    forkFromPostId: sourcePostId,
  }, maliciousPostId)
  assert.equal(serverFork.forkFromId, sourcePostId)
})

test('collection cover requires ownership and membership', async () => {
  const originalCollectionFind = Collection.findById
  const originalMembership = CollectionItem.exists
  let membershipChecks = 0

  CollectionItem.exists = async () => {
    membershipChecks += 1
    return null
  }

  try {
    Collection.findById = async () => ({ _id: collectionId, ownerId: otherUserId })
    const nonOwnerResponse = responseRecorder()
    await routeHandler(collectionsRouter, 'patch', '/:id')({
      params: { id: collectionId },
      body: { coverPostId: sourcePostId },
      userId,
    }, nonOwnerResponse)
    assert.equal(nonOwnerResponse.statusCode, 404)
    assert.equal(membershipChecks, 0)

    let saves = 0
    Collection.findById = async () => ({
      _id: collectionId,
      ownerId: userId,
      async save() { saves += 1 },
    })
    const nonMemberResponse = responseRecorder()
    await routeHandler(collectionsRouter, 'patch', '/:id')({
      params: { id: collectionId },
      body: { coverPostId: sourcePostId },
      userId,
    }, nonMemberResponse)
    assert.equal(nonMemberResponse.statusCode, 400)
    assert.deepEqual(nonMemberResponse.body, { error: '封面作品必须已在该合集内' })
    assert.equal(membershipChecks, 1)
    assert.equal(saves, 0)
  } finally {
    Collection.findById = originalCollectionFind
    CollectionItem.exists = originalMembership
  }
})

test('removing the selected cover item also clears the collection cover', async () => {
  const originalCollectionFind = Collection.findById
  const originalItemDelete = CollectionItem.deleteOne
  let saved = false
  let collection

  collection = {
    _id: collectionId,
    ownerId: userId,
    coverPostId: sourcePostId,
    async save() { saved = true },
  }
  Collection.findById = async () => collection
  CollectionItem.deleteOne = async (filter) => {
    assert.deepEqual(filter, { collectionId, postId: sourcePostId })
    return { deletedCount: 1 }
  }

  try {
    const response = responseRecorder()
    await routeHandler(collectionsRouter, 'delete', '/:id/items/:postId')({
      params: { id: collectionId, postId: sourcePostId },
      userId,
    }, response)
    assert.equal(response.statusCode, 200)
    assert.equal(saved, true)
    assert.equal(collection.coverPostId, undefined)
  } finally {
    Collection.findById = originalCollectionFind
    CollectionItem.deleteOne = originalItemDelete
  }
})
