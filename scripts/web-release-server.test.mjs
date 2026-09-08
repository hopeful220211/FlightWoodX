import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

test('isolated web release server security and rollback tests', () => {
  const result = spawnSync('python3', ['-B', 'deploy/automation/test_server.py'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
})
