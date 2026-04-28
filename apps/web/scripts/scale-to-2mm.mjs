#!/usr/bin/env node
/**
 * Scale all GLB models uniformly so Y-axis thickness = 2.0mm.
 * Uses @gltf-transform SDK to modify root node scale in-place.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { NodeIO } from '@gltf-transform/core'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelsDir = path.resolve(__dirname, '../public/models')
const TARGET_Y = 0.002 // 2mm in meters
const SKIP = new Set(['arm_36.glb', 'arm_37.glb'])

// We need bounding box, so use three.js just for measuring
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const threeLoader = new GLTFLoader()

async function getYSize(filePath) {
  const buf = fs.readFileSync(filePath)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const gltf = await new Promise((r, e) => threeLoader.parse(ab, '', r, e))
  const box = new THREE.Box3().setFromObject(gltf.scene)
  return box.getSize(new THREE.Vector3()).y
}

const io = new NodeIO()
const categories = ['mainboards', 'landings', 'guards', 'joints']
let scaled = 0, skipped = 0

for (const cat of categories) {
  const dir = path.join(modelsDir, cat)
  if (!fs.existsSync(dir)) continue

  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
    if (SKIP.has(file)) { console.log(`SKIP ${cat}/${file}`); skipped++; continue }

    const filePath = path.join(dir, file)
    const currentY = await getYSize(filePath)
    if (Math.abs(currentY - TARGET_Y) < 0.0001) { console.log(`OK   ${cat}/${file} (already 2mm)`); skipped++; continue }

    const factor = TARGET_Y / currentY

    // Read GLB, apply scale to all root nodes, write back
    const doc = await io.read(filePath)
    const root = doc.getRoot()
    for (const node of root.listNodes()) {
      // Only scale root-level nodes (no parent)
      if (!root.listScenes().some(s => s.listChildren().includes(node))) continue
      const s = node.getScale()
      node.setScale([s[0] * factor, s[1] * factor, s[2] * factor])
    }
    // If no root nodes found, scale all scene children
    for (const scene of root.listScenes()) {
      for (const child of scene.listChildren()) {
        const s = child.getScale()
        child.setScale([s[0] * factor, s[1] * factor, s[2] * factor])
      }
    }

    await io.write(filePath, doc)
    console.log(`SCALE ${cat}/${file}: ${(currentY*1000).toFixed(1)}mm → 2.0mm (×${factor.toFixed(3)})`)
    scaled++
  }
}

console.log(`\nDone: ${scaled} scaled, ${skipped} skipped`)
process.exit(0)
