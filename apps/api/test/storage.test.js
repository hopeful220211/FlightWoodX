const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { createConfig } = require('../src/config/env')
const { putObject, deleteObject } = require('../src/lib/storage')

async function withTempStorage(callback) {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fwx-api-storage-'))
  const config = createConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-secret',
    STORAGE_DRIVER: 'disk',
    UPLOAD_DIR: uploadDir,
    PUBLIC_BASE_URL: 'https://api.example.test',
    COVER_UPLOAD_MAX_BYTES: '1024',
    RATE_LIMIT_DISABLED: 'true',
  })
  try {
    await callback({ config, uploadDir })
  } finally {
    await fs.rm(uploadDir, { recursive: true, force: true })
  }
}

test('disk storage writes and removes only managed image objects', async () => {
  await withTempStorage(async ({ config, uploadDir }) => {
    const url = await putObject('covers', Buffer.from('png-data'), 'image/png', config)
    assert.match(url, /^https:\/\/api\.example\.test\/uploads\/covers\/[\w-]+\.png$/)

    const key = new URL(url).pathname.replace('/uploads/', '')
    assert.equal(await fs.readFile(path.join(uploadDir, key), 'utf8'), 'png-data')
    assert.equal(await deleteObject('https://elsewhere.example/file.png', config), false)
    assert.equal(await deleteObject(url, config), true)
    await assert.rejects(fs.stat(path.join(uploadDir, key)), { code: 'ENOENT' })
  })
})

test('storage rejects unsupported and oversized bodies before writing', async () => {
  await withTempStorage(async ({ config }) => {
    await assert.rejects(
      putObject('covers', Buffer.from('text'), 'text/plain', config),
      (error) => error.status === 415,
    )
    await assert.rejects(
      putObject('covers', Buffer.alloc(1025), 'image/png', config),
      (error) => error.status === 413,
    )
  })
})
