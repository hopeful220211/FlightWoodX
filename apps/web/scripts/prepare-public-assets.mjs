import './optimize-public-images.mjs'
import { copyFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const blocklyRoot = path.dirname(require.resolve('blockly'))
const destination = fileURLToPath(new URL('../public/blockly-media/', import.meta.url))
await mkdir(destination, { recursive: true })
for (const file of await readdir(path.join(blocklyRoot, 'media'), { withFileTypes: true })) {
  if (!file.isFile()) continue
  await copyFile(path.join(blocklyRoot, 'media', file.name), path.join(destination, file.name))
}
await copyFile(fileURLToPath(new URL('../public/licenses/blockly-LICENSE.txt', import.meta.url)), path.join(destination, 'LICENSE'))
console.log('Blockly media prepared for same-origin loading')
