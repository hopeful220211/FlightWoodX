#!/usr/bin/env node
/**
 * Audit all GLB files for connector metadata.
 * Usage: node scripts/audit-connectors.mjs
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const modelsDir = path.resolve(__dirname, '../public/models')
const categories = ['mainboards', 'landings', 'guards', 'joints']

const loader = new GLTFLoader()
const results = []

for (const cat of categories) {
  const dir = path.join(modelsDir, cat)
  if (!fs.existsSync(dir)) continue

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.glb')).sort()

  for (const file of files) {
    const filePath = path.join(dir, file)
    const buffer = fs.readFileSync(filePath)
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.parse(ab, '', resolve, reject)
      })

      const conns = []
      gltf.scene.traverse((obj) => {
        if (!obj.name) return
        const n = obj.name.trim()
        const nl = n.toLowerCase()

        let type = null
        if (nl.startsWith('socket_') || nl.startsWith('conn_socket_')) type = 'socket'
        else if (nl.startsWith('plug_') || nl.startsWith('conn_plug_')) type = 'plug'
        if (!type) return

        const pos = new THREE.Vector3()
        const quat = new THREE.Quaternion()
        obj.getWorldPosition(pos)
        obj.getWorldQuaternion(quat)

        const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ')
        const dx = Math.round(euler.x * 180 / Math.PI)
        const dy = Math.round(euler.y * 180 / Math.PI)
        const dz = Math.round(euler.z * 180 / Math.PI)

        conns.push({ name: n, type, pos: `(${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)})`, rot: `(${dx}°, ${dy}°, ${dz}°)`, dx, dy, dz })
      })

      const sockets = conns.filter(c => c.type === 'socket')
      const plugs = conns.filter(c => c.type === 'plug')

      results.push({ file: `${cat}/${file}`, cat, sockets: sockets.length, plugs: plugs.length, conns })
    } catch (err) {
      results.push({ file: `${cat}/${file}`, cat, sockets: '?', plugs: '?', conns: [], err: err.message })
    }
  }
}

// Build markdown
let md = '# Connector Audit Report\n\n'
md += '| 零件文件 | 分类 | socket | plug | rotation 样例 | 备注 |\n'
md += '|---|---|---|---|---|---|\n'

for (const r of results) {
  const sample = r.conns.length > 0 ? r.conns[0].rot : (r.err || 'N/A')
  const notes = []
  if (r.sockets === 0 && r.plugs === 0) notes.push('🔴 无连接点')
  if (typeof r.sockets === 'number' && r.sockets === 1) notes.push('⚠️ 仅1 socket')
  if (typeof r.plugs === 'number' && r.plugs === 0 && r.sockets > 0) notes.push('⚠️ 无 plug')
  // Check rotation anomalies
  for (const c of r.conns) {
    if (Math.abs(c.dx) !== 90 && Math.abs(c.dx) !== 0 && Math.abs(c.dx) !== 180) {
      notes.push(`❌ X=${c.dx}°`)
      break
    }
  }
  md += `| ${r.file} | ${r.cat} | ${r.sockets} | ${r.plugs} | ${sample} | ${notes.join(' ')} |\n`
}

// Summary
const total = results.length
const noConn = results.filter(r => r.conns.length === 0).length
const lowPlug = results.filter(r => typeof r.plugs === 'number' && r.plugs === 0 && r.sockets > 0).length
md += `\n## Summary\n- Total: ${total}\n- No connectors: ${noConn}\n- Has sockets but no plugs: ${lowPlug}\n`

// Detailed first 15
md += '\n## Detailed (first 15 with connectors)\n\n'
for (const r of results.filter(r => r.conns.length > 0).slice(0, 15)) {
  md += `### ${r.file}\n`
  for (const c of r.conns) md += `- **${c.name}** (${c.type}): pos=${c.pos} rot=${c.rot}\n`
  md += '\n'
}

const outPath = path.resolve(__dirname, '../../../docs/rfcs/connector-audit-2026-04-28.md')
fs.writeFileSync(outPath, md)
console.log(`Written to ${outPath}`)
console.log(`Total: ${total}, No connectors: ${noConn}, No plugs: ${lowPlug}`)
process.exit(0)
