#!/usr/bin/env node
/**
 * Deep audit: for each GLB, check connector positions, orientations,
 * and whether the -Y insertion direction is consistent.
 * Goal: find which models are "different" from the majority.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelsDir = path.resolve(__dirname, '../public/models')
const loader = new GLTFLoader()
const categories = ['mainboards', 'landings', 'guards', 'joints']

async function auditModel(filePath) {
  const buf = fs.readFileSync(filePath)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const gltf = await new Promise((r, e) => loader.parse(ab, '', r, e))

  const box = new THREE.Box3().setFromObject(gltf.scene)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  const connectors = []
  gltf.scene.traverse(obj => {
    const nl = (obj.name || '').toLowerCase()
    let type = null
    if (nl.includes('socket')) type = 'socket'
    else if (nl.includes('plug')) type = 'plug'
    if (!type) return

    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    obj.getWorldPosition(pos)
    obj.getWorldQuaternion(quat)

    // -Y direction = insertion direction per convention
    const negY = new THREE.Vector3(0, -1, 0).applyQuaternion(quat)
    const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ')

    // Check if connector is inside the model bounding box
    const insideBBox = box.containsPoint(pos)

    // Distance from model center
    const distFromCenter = pos.distanceTo(center)

    connectors.push({
      name: obj.name,
      type,
      pos: { x: pos.x, y: pos.y, z: pos.z },
      negY: { x: +negY.x.toFixed(3), y: +negY.y.toFixed(3), z: +negY.z.toFixed(3) },
      eulerDeg: {
        x: Math.round(euler.x * 180 / Math.PI),
        y: Math.round(euler.y * 180 / Math.PI),
        z: Math.round(euler.z * 180 / Math.PI),
      },
      insideBBox,
      distFromCenter: +distFromCenter.toFixed(4),
    })
  })

  return {
    size: { x: +size.x.toFixed(4), y: +size.y.toFixed(4), z: +size.z.toFixed(4) },
    center: { x: +center.x.toFixed(4), y: +center.y.toFixed(4), z: +center.z.toFixed(4) },
    connectors,
  }
}

// Audit all
const results = []
for (const cat of categories) {
  const dir = path.join(modelsDir, cat)
  if (!fs.existsSync(dir)) continue
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort()) {
    const data = await auditModel(path.join(dir, file))
    results.push({ file: `${cat}/${file}`, cat, ...data })
  }
}

// Analysis: find patterns
let md = '# Snap Consistency Audit\n\n'

// 1. Connector -Y direction distribution
md += '## 1. Connector -Y Direction Patterns\n\n'
md += 'The -Y axis is the "insertion direction". All connectors of the same type should point consistently.\n\n'

const dirCounts = {}
for (const r of results) {
  for (const c of r.connectors) {
    const key = `${c.negY.x},${c.negY.y},${c.negY.z}`
    dirCounts[key] = (dirCounts[key] || 0) + 1
  }
}
md += '| -Y Direction | Count | Interpretation |\n|---|---|---|\n'
for (const [dir, count] of Object.entries(dirCounts).sort((a, b) => b[1] - a[1])) {
  md += `| (${dir}) | ${count} | |\n`
}

// 2. Per-category breakdown
md += '\n## 2. Per-Category Connector Details\n\n'
for (const cat of categories) {
  const catResults = results.filter(r => r.cat === cat)
  md += `### ${cat}\n\n`
  md += '| File | Connectors | Types | -Y Directions | Inside BBox | Euler X |\n'
  md += '|---|---|---|---|---|---|\n'

  for (const r of catResults) {
    const types = r.connectors.map(c => c.type).join(',')
    const dirs = [...new Set(r.connectors.map(c => `(${c.negY.x},${c.negY.y},${c.negY.z})`))].join(' ')
    const inside = r.connectors.every(c => c.insideBBox) ? '✅' : '❌ outside'
    const eulerXs = [...new Set(r.connectors.map(c => c.eulerDeg.x))].join(',')
    md += `| ${r.file} | ${r.connectors.length} | ${types} | ${dirs} | ${inside} | ${eulerXs}° |\n`
  }
  md += '\n'
}

// 3. Anomaly detection: parts where connectors are OUTSIDE bounding box
md += '## 3. Anomalies: Connectors Outside Bounding Box\n\n'
const outsiders = results.filter(r => r.connectors.some(c => !c.insideBBox))
if (outsiders.length === 0) {
  md += 'None found ✅\n\n'
} else {
  md += `Found ${outsiders.length} parts with connectors outside their bounding box:\n\n`
  for (const r of outsiders) {
    const bad = r.connectors.filter(c => !c.insideBBox)
    md += `- **${r.file}**: ${bad.length} connector(s) outside\n`
    for (const c of bad) {
      md += `  - ${c.name}: pos=(${c.pos.x.toFixed(4)}, ${c.pos.y.toFixed(4)}, ${c.pos.z.toFixed(4)}) dist=${c.distFromCenter}\n`
    }
  }
}

// 4. Check: do all connectors in a category have the same Euler X?
md += '\n## 4. Euler X Consistency Check\n\n'
for (const cat of categories) {
  const allEulerX = results.filter(r => r.cat === cat).flatMap(r => r.connectors.map(c => c.eulerDeg.x))
  const unique = [...new Set(allEulerX)]
  const consistent = unique.length <= 2 ? '✅' : '⚠️ INCONSISTENT'
  md += `- **${cat}**: Euler X values = [${unique.join(', ')}] ${consistent}\n`
}

const outPath = path.resolve(__dirname, '../../../docs/rfcs/snap-consistency-audit-2026-04-28.md')
fs.writeFileSync(outPath, md)
console.log(`Written to ${outPath}`)
console.log(`Total: ${results.length} parts, ${results.reduce((s,r) => s + r.connectors.length, 0)} connectors`)

process.exit(0)
