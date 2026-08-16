import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelsDir = path.resolve(__dirname, '../public/models')
const loader = new GLTFLoader()
const categories = ['mainboards', 'landings', 'guards', 'joints']

const results = []

for (const cat of categories) {
  const dir = path.join(modelsDir, cat)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
    const buf = fs.readFileSync(path.join(dir, file))
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    try {
      const gltf = await new Promise((r, e) => loader.parse(ab, '', r, e))
      const box = new THREE.Box3().setFromObject(gltf.scene)
      const size = box.getSize(new THREE.Vector3())
      results.push({
        file: `${cat}/${file}`,
        x: size.x.toFixed(4),
        y: size.y.toFixed(4),
        z: size.z.toFixed(4),
        thicknessMM: (size.y * 1000).toFixed(1), // assuming Y is up, units in meters
      })
    } catch { results.push({ file: `${cat}/${file}`, x: '?', y: '?', z: '?', thicknessMM: '?' }) }
  }
}

// Print sorted by category
console.log('| 零件 | X (宽) | Y (厚) | Z (深) | 厚度 mm |')
console.log('|---|---|---|---|---|')
for (const r of results) {
  const mark = r.file.includes('arm_36') || r.file.includes('arm_37') ? ' ⭐标准' : ''
  console.log(`| ${r.file} | ${r.x} | ${r.y} | ${r.z} | ${r.thicknessMM}${mark} |`)
}

process.exit(0)
