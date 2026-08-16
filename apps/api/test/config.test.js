const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('path')
const { createConfig } = require('../src/config/env')

function testEnv(overrides = {}) {
  return {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-secret',
    STORAGE_DRIVER: 'disk',
    RATE_LIMIT_DISABLED: 'true',
    ...overrides,
  }
}

test('configuration has safe proxy and upload defaults', () => {
  const config = createConfig(testEnv({ CORS_ORIGIN: 'https://one.example, https://two.example' }))
  assert.equal(config.trustProxyHops, 0)
  assert.equal(config.jsonBodyLimitBytes, 6 * 1024 * 1024)
  assert.equal(config.cadPartsDir, path.resolve(__dirname, '../assets/cad/parts'))
  assert.equal(config.storage.maxCoverBytes, 5 * 1024 * 1024)
  assert.deepEqual(config.corsOrigins, ['https://one.example', 'https://two.example'])
})

test('JSON request body limit stays within the supported safety range', () => {
  assert.throws(
    () => createConfig(testEnv({ JSON_BODY_MAX_BYTES: String(9 * 1024 * 1024) })),
    /JSON_BODY_MAX_BYTES/,
  )
})

test('production rejects weak secrets and credentialed wildcard CORS', () => {
  assert.throws(
    () => createConfig(testEnv({ NODE_ENV: 'production', JWT_SECRET: 'secret' })),
    /JWT_SECRET/,
  )
  assert.throws(
    () => createConfig(testEnv({ CORS_ORIGIN: '*' })),
    /CORS_ORIGIN/,
  )
})

test('selected remote storage driver must be fully configured', () => {
  assert.throws(
    () => createConfig(testEnv({ STORAGE_DRIVER: 's3' })),
    /S3 configuration is incomplete/,
  )

  const config = createConfig(testEnv({
    STORAGE_DRIVER: 's3',
    S3_REGION: 'us-east-1',
    S3_BUCKET: 'flightwoodx-test',
    S3_ACCESS_KEY_ID: 'access-key',
    S3_SECRET_ACCESS_KEY: 'secret-key',
  }))
  assert.equal(config.storage.driver, 's3')
})
