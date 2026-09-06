#!/usr/bin/env node
// Existing disk files only. Default read-only; applying requires an exact count,
// database name and an exclusive backup file. No files or records are deleted.
const fs = require('node:fs/promises')
const path = require('node:path')

async function planCoverRepair(rows, uploadDir) {
  const root = await fs.realpath(uploadDir)
  const changes = []
  for (const row of rows) {
    // Match the original string before URL normalization could hide traversal.
    const match = typeof row.coverUrl === 'string' && row.coverUrl.match(
      /^https?:\/\/localhost(?::[0-9]+)?(\/uploads\/covers\/[a-zA-Z0-9_-]+\.(?:png|jpg|webp))$/,
    )
    if (!match) continue
    const target = path.join(root, match[1].slice('/uploads/'.length))
    try {
      const stat = await fs.lstat(target)
      if (!stat.isFile() || stat.isSymbolicLink() || await fs.realpath(target) !== target) continue
      changes.push({ id: String(row._id), before: row.coverUrl, after: match[1] })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return changes
}

async function applyCoverRepair(collection, changes, { database, expectedCount, backupFile, ObjectId }) {
  if (changes.length !== expectedCount || !path.isAbsolute(backupFile)) throw new Error('Repair scope or backup path does not match')
  await fs.writeFile(backupFile, JSON.stringify({ schemaVersion: 1, database, collection: 'projects', changes }), { flag: 'wx', mode: 0o600 })
  for (const change of changes) {
    const result = await collection.updateOne({ _id: new ObjectId(change.id), coverUrl: change.before }, { $set: { coverUrl: change.after } })
    if (result.modifiedCount !== 1) throw new Error('Concurrent change detected; inspect the backup before continuing')
  }
}

async function main() {
  const option = name => process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  const database = option('database')
  if (!database || !process.env.MONGODB_URI || !process.env.UPLOAD_DIR) throw new Error('Explicit database, MongoDB URI and upload directory are required')
  const { MongoClient, ObjectId } = require('mongoose').mongo
  const client = new MongoClient(process.env.MONGODB_URI)
  try {
    await client.connect()
    const db = client.db()
    if (db.databaseName !== database) throw new Error('Database does not match')
    const collection = db.collection('projects')
    const rows = await collection.find({ coverUrl: /^https?:\/\/localhost(?::[0-9]+)?\/uploads\/covers\// }, { projection: { coverUrl: 1 } }).toArray()
    const changes = await planCoverRepair(rows, process.env.UPLOAD_DIR)
    const apply = process.argv.includes('--apply')
    if (apply) await applyCoverRepair(collection, changes, { database, expectedCount: Number(option('expect-count')), backupFile: option('backup') || '', ObjectId })
    console.log(JSON.stringify({ mode: apply ? 'applied' : 'read-only', matched: rows.length, eligible: changes.length, paths: changes.map(change => change.after) }))
  } finally { await client.close() }
}

if (require.main === module) main().catch(() => {
  // Driver exceptions may include credentials; do not print raw errors.
  console.error('Cover repair failed. No records are deleted; inspect the protected backup before retrying.')
  process.exitCode = 1
})

module.exports = { planCoverRepair, applyCoverRepair }
