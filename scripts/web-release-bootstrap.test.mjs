import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('one-time release bootstrap enforces key, mount, privilege and no-backend boundaries', () => {
  const result = spawnSync('python3', ['-I', '-B', '-m', 'unittest', 'discover', '-s', 'deploy/automation', '-p', 'test_bootstrap.py'], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stderr, /Ran \d+ tests/)
})
