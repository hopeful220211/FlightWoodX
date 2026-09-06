const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { MongoClient, ObjectId } = require('mongoose').mongo
const { planCoverRepair, applyCoverRepair } = require('../scripts/repair-localhost-covers')

test('legacy cover repair accepts only existing regular local cover files and does not mutate input', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fwx-cover-repair-'))
  try {
    await fs.mkdir(path.join(root, 'covers'))
    await fs.writeFile(path.join(root, 'covers', 'old.png'), 'image')
    await fs.symlink(path.join(root, 'covers', 'old.png'), path.join(root, 'covers', 'link.png'))
    const row = { _id: 'a', coverUrl: 'http://localhost:3000/uploads/covers/old.png' }
    assert.deepEqual(await planCoverRepair([row], root), [{ id: 'a', before: row.coverUrl, after: '/uploads/covers/old.png' }])
    assert.match(row.coverUrl, /^http:/)
    for (const coverUrl of [
      'https://external.example/uploads/covers/old.png', '/uploads/covers/old.png',
      'http://localhost:3000/uploads/covers/missing.png', 'http://localhost:3000/uploads/covers/link.png',
      'http://localhost:3000/uploads/covers/%2e%2e/old.png', 'http://localhost:3000/uploads/covers/old.png?token=x',
      'http://user:password@localhost:3000/uploads/covers/old.png',
    ]) assert.deepEqual(await planCoverRepair([{ _id: 'b', coverUrl }], root), [])
  } finally { await fs.rm(root, { recursive: true, force: true }) }
})

test('repair uses an exclusive backup and compare-and-set on an isolated real database', { skip: !process.env.FWX_TEST_MONGO_URI }, async () => {
  const uri = process.env.FWX_TEST_MONGO_URI
  assert.match(uri, /^mongodb:\/\/(127\.0\.0\.1|localhost):\d+(\/[^?]*)?$/)
  const database = `fwx_cover_repair_${randomBytes(8).toString('hex')}`
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fwx-cover-repair-db-'))
  const client = new MongoClient(uri)
  try {
    await client.connect()
    const collection = client.db(database).collection('projects')
    const id = new ObjectId()
    const before = 'http://localhost:3000/uploads/covers/old.png'
    const after = '/uploads/covers/old.png'
    await collection.insertOne({ _id: id, coverUrl: before, name: 'preserved' })
    const changes = [{ id: String(id), before, after }]
    const options = { database, expectedCount: 1, backupFile: path.join(root, 'backup.json'), ObjectId }
    await assert.rejects(applyCoverRepair(collection, changes, { ...options, expectedCount: 2 }))
    assert.equal((await collection.findOne({ _id: id })).coverUrl, before)
    await applyCoverRepair(collection, changes, options)
    const backup = JSON.parse(await fs.readFile(options.backupFile, 'utf8'))
    assert.deepEqual(backup.changes, changes)
    assert.equal((await fs.stat(options.backupFile)).mode & 0o777, 0o600)
    assert.deepEqual(await collection.findOne({ _id: id }), { _id: id, coverUrl: after, name: 'preserved' })
    await assert.rejects(applyCoverRepair(collection, changes, options), { code: 'EEXIST' })
    await assert.rejects(applyCoverRepair(collection, changes, { ...options, backupFile: path.join(root, 'concurrent.json') }), /Concurrent change/)
    // Rehearse the bounded rollback without touching any other fields.
    assert.equal((await collection.updateOne({ _id: id, coverUrl: after }, { $set: { coverUrl: before } })).modifiedCount, 1)
  } finally {
    await client.db(database).dropDatabase()
    await client.close()
    await fs.rm(root, { recursive: true, force: true })
  }
})
