#!/usr/bin/env node

/**
 * One-shot script: wipe all designs from MongoDB.
 * Clears both 'test' and 'flightwoodx' databases' designs collections.
 * Does NOT delete users.
 *
 * Usage:
 *   cd apps/api && node scripts/wipe-designs.js
 */

require('dotenv').config()
const mongoose = require('mongoose')

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[ERROR] MONGODB_URI not set. Check your .env file.')
    process.exit(1)
  }

  const conn = await mongoose.createConnection(uri).asPromise()
  console.log('[OK] Connected to MongoDB')

  // Get the default database from the URI
  const defaultDb = conn.db
  const defaultDbName = defaultDb.databaseName
  console.log(`[INFO] Default database: ${defaultDbName}`)

  // Databases to clean
  const dbNames = new Set([defaultDbName, 'test', 'flightwoodx'])

  for (const dbName of dbNames) {
    const db = conn.useDb(dbName).db
    try {
      const collections = await db.listCollections({ name: 'designs' }).toArray()
      if (collections.length === 0) {
        console.log(`[${dbName}] No 'designs' collection — skipping`)
        continue
      }

      const before = await db.collection('designs').countDocuments()
      await db.collection('designs').deleteMany({})
      const after = await db.collection('designs').countDocuments()

      console.log(`[${dbName}] Designs wiped: ${before} → ${after}`)
    } catch (err) {
      console.warn(`[${dbName}] Error: ${err.message}`)
    }
  }

  await conn.close()
  console.log('\n[DONE] Designs cleared. User accounts preserved.')
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
