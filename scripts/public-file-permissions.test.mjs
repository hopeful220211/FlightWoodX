import test from 'node:test'
import assert from 'node:assert/strict'
import { chmod, lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { makeDistReadable } from '../apps/web/scripts/finalize-public-assets.mjs'

test('published assets remain readable after a build from a private-umask checkout', async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'fwx-public-modes-')))
  const dist = path.join(root, 'dist')
  try {
    await mkdir(path.join(dist, 'models'), { recursive: true, mode: 0o700 })
    await writeFile(path.join(dist, 'models', 'part.glb'), 'glTF', { mode: 0o600 })
    await makeDistReadable(dist)
    assert.equal((await lstat(dist)).mode & 0o777, 0o755)
    assert.equal((await lstat(path.join(dist, 'models'))).mode & 0o777, 0o755)
    assert.equal((await lstat(path.join(dist, 'models', 'part.glb'))).mode & 0o777, 0o644)
    assert.equal(await readFile(path.join(dist, 'models', 'part.glb'), 'utf8'), 'glTF')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('public permission finalization refuses symlinks and does not expose external files', async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'fwx-public-boundary-')))
  try {
    await mkdir(path.join(root, 'dist'))
    const secret = path.join(root, 'private.env')
    await writeFile(secret, 'private', { mode: 0o600 })
    await chmod(secret, 0o600)
    await symlink(secret, path.join(root, 'dist', 'bad-link'))
    await assert.rejects(makeDistReadable(path.join(root, 'dist')), /symbolic link/)
    assert.equal((await lstat(secret)).mode & 0o777, 0o600)
  } finally { await rm(root, { recursive: true, force: true }) }
})
