const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

test('wipe script refuses to connect without an explicit destructive-operation guard', () => {
  const apiDir = path.resolve(__dirname, '..')
  const result = spawnSync(process.execPath, ['scripts/wipe-designs.js'], {
    cwd: apiDir,
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH,
      MONGODB_URI: 'mongodb://127.0.0.1:1/should-not-connect',
    },
    timeout: 3000,
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Refusing to delete/)
  assert.doesNotMatch(result.stderr, /ECONNREFUSED|timed out/i)
})
