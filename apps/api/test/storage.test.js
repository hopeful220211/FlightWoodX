const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { createConfig } = require('../src/config/env')
const { putObject, deleteObject, bestEffortDeleteObject } = require('../src/lib/storage')
const OSS = require('ali-oss')

function ossConfig() {
  return createConfig({
    NODE_ENV: 'test',
    STORAGE_DRIVER: 'oss',
    OSS_REGION: 'oss-cn-chengdu',
    OSS_ASSETS_BUCKET: 'fwx-storage-test',
    OSS_ACCESS_KEY_ID: 'test-only-access-id',
    OSS_SECRET: 'test-only-access-secret',
  })
}

// Keep the actual OSS client and object methods; replace only its network boundary.
function captureOssRequests(t) {
  const requests = []
  t.mock.method(OSS.prototype, 'request', async function (params) {
    requests.push({ ...params, protocol: this.options.endpoint.protocol, client: this })
    const status = params.method === 'DELETE' ? 204 : 200
    return { status, res: { status, headers: {} } }
  })
  return requests
}

test('OSS uploads use HTTPS and return the configured public object URL', async (t) => {
  const requests = captureOssRequests(t)
  const config = ossConfig()
  const url = await putObject('covers', Buffer.from('png-data'), 'image/png', config)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, 'PUT')
  assert.equal(requests[0].protocol, 'https:')
  assert.equal(requests[0].headers['Content-Type'], 'image/png')
  assert.equal(url, `https://fwx-storage-test.oss-cn-chengdu.aliyuncs.com/${requests[0].object}`)
})

test('OSS removal initializes its own client with HTTPS', async (t) => {
  const requests = captureOssRequests(t)
  const url = 'https://fwx-storage-test.oss-cn-chengdu.aliyuncs.com/covers/design-a/owned.png'
  assert.equal(await deleteObject(url, ossConfig(), 'covers/design-a'), true)
  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, 'DELETE')
  assert.equal(requests[0].protocol, 'https:')
})

test('OSS cleanup cannot delete another design, official assets or legacy unowned objects', async (t) => {
  const requests = captureOssRequests(t)
  const config = ossConfig()
  const base = 'https://fwx-storage-test.oss-cn-chengdu.aliyuncs.com'
  for (const key of ['covers/design-b/cover.png', 'covers/design-a-other/cover.png', 'models/mainboards/core_hub_01.glb', 'covers/legacy.png']) {
    assert.equal(await deleteObject(`${base}/${key}`, config, 'covers/design-a'), false)
  }
  assert.equal(requests.length, 0)
})

test('cleanup without a server-established object prefix is denied', async (t) => {
  const requests = captureOssRequests(t)
  const url = 'https://fwx-storage-test.oss-cn-chengdu.aliyuncs.com/covers/design-a/owned.png'
  assert.equal(await deleteObject(url, ossConfig()), false)
  assert.equal(requests.length, 0)
})

test('failed remote cleanup does not log signed request or credential details', async (t) => {
  const logs = []
  t.mock.method(console, 'warn', (...args) => logs.push(args.join(' ')))
  t.mock.method(OSS.prototype, 'request', async () => {
    throw new Error('https://storage.example.test/file?Signature=sensitive-test-marker')
  })
  const url = 'https://fwx-storage-test.oss-cn-chengdu.aliyuncs.com/covers/design-a/owned.png'
  assert.equal(await bestEffortDeleteObject(url, ossConfig(), 'covers/design-a'), false)
  assert.equal(logs.length, 1)
  assert.equal(logs.join(' ').includes('sensitive-test-marker'), false)
})

async function withTempStorage(callback, publicBaseUrl = 'https://api.example.test') {
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fwx-api-storage-'))
  const config = createConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-secret',
    STORAGE_DRIVER: 'disk',
    UPLOAD_DIR: uploadDir,
    PUBLIC_BASE_URL: publicBaseUrl,
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
    const url = await putObject('covers/design-a', Buffer.from('png-data'), 'image/png', config)
    assert.match(url, /^https:\/\/api\.example\.test\/uploads\/covers\/design-a\/[\w-]+\.png$/)

    const key = new URL(url).pathname.replace('/uploads/', '')
    assert.equal(await fs.readFile(path.join(uploadDir, key), 'utf8'), 'png-data')
    assert.equal(await deleteObject('https://elsewhere.example/file.png', config, 'covers/design-a'), false)
    assert.equal(await deleteObject(url, config, 'covers/design-b'), false)
    assert.equal(await fs.readFile(path.join(uploadDir, key), 'utf8'), 'png-data')
    assert.equal(await deleteObject(url, config, 'covers/design-a'), true)
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

test('disk mode uses the production public base without deleting legacy covers or OSS references', async () => {
  await withTempStorage(async ({ config, uploadDir }) => {
    const legacyUrl = await putObject('covers', Buffer.from('old-image'), 'image/png', config)
    const currentUrl = await putObject('covers/design-a', Buffer.from('new-image'), 'image/png', config)
    assert.match(currentUrl, /^https:\/\/flightwoodx\.com\/uploads\/covers\/design-a\/[\w-]+\.png$/)
    assert.equal(await deleteObject(legacyUrl, config, 'covers/design-a'), false)
    assert.equal(await deleteObject('https://fwx-storage-test.oss-cn-chengdu.aliyuncs.com/covers/old.png', config, 'covers/design-a'), false)
    const legacyKey = new URL(legacyUrl).pathname.replace('/uploads/', '')
    assert.equal(await fs.readFile(path.join(uploadDir, legacyKey), 'utf8'), 'old-image')
    assert.equal(await deleteObject(currentUrl, config, 'covers/design-a'), true)
  }, 'https://flightwoodx.com')
})
