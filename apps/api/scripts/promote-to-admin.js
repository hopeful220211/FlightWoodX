#!/usr/bin/env node

/**
 * One-shot script: promote a user to admin role.
 *
 * Usage:
 *   node scripts/promote-to-admin.js --email user@example.com
 *
 * Reads MONGODB_URI from .env (dotenv) so it works for both local and
 * production databases — just point .env at the right URI.
 */

require('dotenv').config()
const mongoose = require('mongoose')

const email = (() => {
  const idx = process.argv.indexOf('--email')
  if (idx === -1 || !process.argv[idx + 1]) {
    console.error('Usage: node scripts/promote-to-admin.js --email <email>')
    process.exit(1)
  }
  return process.argv[idx + 1]
})()

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('[ERROR] MONGODB_URI not set. Check your .env file.')
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log('[OK] Connected to MongoDB')

  const User = require('../src/models/User')

  const user = await User.findOne({ email }).select('username email role')
  if (!user) {
    console.error(`[ERROR] No user found with email: ${email}`)
    await mongoose.disconnect()
    process.exit(1)
  }

  const before = user.role
  console.log(`\n  User:   ${user.username} <${user.email}>`)
  console.log(`  Before: role = "${before}"`)

  if (before === 'admin') {
    console.log('  → Already admin. Nothing to do.\n')
    await mongoose.disconnect()
    return
  }

  user.role = 'admin'
  await user.save()

  console.log(`  After:  role = "admin"`)
  console.log('  → Promoted successfully.\n')

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('[FATAL]', err)
  process.exit(1)
})
