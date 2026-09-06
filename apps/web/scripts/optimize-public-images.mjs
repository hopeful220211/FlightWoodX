import { readdir, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const sourceDir = path.join(publicDir, 'resource/picture')
const outputDir = path.join(publicDir, 'optimized/picture')
let inputBytes = 0
let outputBytes = 0
let count = 0

async function optimize(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name)
    const name = path.join(relative, entry.name)
    if (entry.isDirectory()) { await optimize(source, name); continue }
    if (!/\.(png|jpe?g)$/i.test(entry.name)) continue
    const destination = path.join(outputDir, name.replace(/\.[^.]+$/, '.webp'))
    const original = await stat(source)
    const previous = await stat(destination).catch(() => null)
    if (!previous || previous.mtimeMs < original.mtimeMs) {
      await mkdir(path.dirname(destination), { recursive: true })
      await sharp(source).rotate().resize({ width: 1440, height: 1440, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(destination)
    }
    inputBytes += original.size
    outputBytes += (await stat(destination)).size
    count++
  }
}

await optimize(sourceDir)
console.log(`Public images: ${count} WebP files, ${(inputBytes / 1048576).toFixed(1)} MB → ${(outputBytes / 1048576).toFixed(1)} MB`)
