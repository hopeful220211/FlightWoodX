#!/usr/bin/env node
/**
 * Scale all GLB vertex POSITION data uniformly so Y thickness = 2.0mm.
 * Only modifies mesh vertex positions. Does NOT touch node scale/translation.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { NodeIO } from '@gltf-transform/core'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelsDir = path.resolve(__dirname, '../public/models')
const TARGET_Y = 0.002
const threeLoader = new GLTFLoader()
const io = new NodeIO()

async function getYSize(filePath) {
  const buf = fs.readFileSync(filePath)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const gltf = await new Promise((r, e) => threeLoader.parse(ab, '', r, e))
  return new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y
}

const categories = ['mainboards', 'landings', 'guards', 'joints']
let scaled = 0, skipped = 0

for (const cat of categories) {
  const dir = path.join(modelsDir, cat)
  if (!fs.existsSync(dir)) continue

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
    const filePath = path.join(dir, file)
    const currentY = await getYSize(filePath)

    if (Math.abs(currentY - TARGET_Y) < 0.0002) {
      console.log(`OK   ${cat}/${file} (${(currentY*1000).toFixed(1)}mm)`)
      skipped++
      continue
    }

    const factor = TARGET_Y / currentY
    const doc = await io.read(filePath)

    // Scale ONLY mesh vertex POSITION data
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION')
        if (!pos) continue
        const arr = pos.getArray()
        if (!arr) continue
        for (let i = 0; i < arr.length; i++) {
          arr[i] *= factor
        }
      }
    }

    await io.write(filePath, doc)
    console.log(`SCALE ${cat}/${file}: ${(currentY*1000).toFixed(1)}mm → 2.0mm (×${factor.toFixed(3)})`)
    scaled++
  }
}

console.log(`\nDone: ${scaled} scaled, ${skipped} skipped`)
process.exit(0)
