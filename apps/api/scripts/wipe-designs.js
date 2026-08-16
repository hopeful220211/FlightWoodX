#!/usr/bin/env node

require('dotenv').config()
const mongoose = require('mongoose')

function argument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set. Check your .env file.')
  if (process.env.ALLOW_DESTRUCTIVE_SCRIPTS !== 'WIPE_DESIGNS') {
    throw new Error('Refusing to delete: set ALLOW_DESTRUCTIVE_SCRIPTS=WIPE_DESIGNS for this one command')
  }
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
    throw new Error('Refusing to delete production data without --allow-production')
  }

  const conn = await mongoose.createConnection(uri).asPromise()
  try {
    const dbName = conn.db.databaseName
    const expectedConfirmation = `${dbName}/designs`
    if (argument('--confirm') !== expectedConfirmation) {
      throw new Error(`Refusing to delete: pass --confirm ${expectedConfirmation}`)
    }

    const collectionExists = await conn.db.listCollections({ name: 'designs' }).hasNext()
    if (!collectionExists) {
      console.log(`[${dbName}] No 'designs' collection — nothing deleted`)
      return
    }

    const before = await conn.db.collection('designs').countDocuments()
    const result = await conn.db.collection('designs').deleteMany({})
    console.log(`[${dbName}] Designs deleted: ${result.deletedCount} of ${before}`)
  } finally {
    await conn.close()
  }
}

main().catch((error) => {
  console.error('[FATAL]', error.message)
  process.exit(1)
})
