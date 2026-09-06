import { chmod, lstat, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Vite copies the source mode for public files. A checkout made with umask 077
// otherwise produces files nginx's unprivileged worker cannot read.
// This only changes generated public dist output, never source/config/backups.
export async function makeDistReadable(directory) {
  const root = path.resolve(directory)
  if (await realpath(root) !== root) throw new Error('Public output root cannot be a symbolic link')
  const entries = []
  async function scan(target) {
    const stat = await lstat(target)
    if (stat.isSymbolicLink()) throw new Error('Public output cannot contain a symbolic link')
    if (stat.isDirectory()) {
      entries.push([target, 0o755])
      for (const name of await readdir(target)) await scan(path.join(target, name))
    } else if (stat.isFile() && stat.nlink === 1) {
      entries.push([target, 0o644])
    } else throw new Error('Public output contains an unsupported file')
  }
  await scan(root)
  for (const [target, mode] of entries) await chmod(target, mode)
  return entries.length
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const count = await makeDistReadable(fileURLToPath(new URL('../dist/', import.meta.url)))
  console.log(`Public output permissions verified: ${count} entries`)
}
