import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const loader = new GLTFLoader()

async function loadModel(relPath) {
  const filePath = path.resolve(__dirname, '../public/models', relPath)
  const buffer = fs.readFileSync(filePath)
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  const gltf = await new Promise((resolve, reject) => loader.parse(ab, '', resolve, reject))

  const conns = []
  gltf.scene.traverse((obj) => {
    const nl = (obj.name || '').toLowerCase()
    let type = null
    if (nl.startsWith('socket_') || nl.startsWith('conn_socket_')) type = 'socket'
    else if (nl.startsWith('plug_') || nl.startsWith('conn_plug_')) type = 'plug'
    if (!type) return

    const pos = new THREE.Vector3()
    const quat = new THREE.Quaternion()
    obj.getWorldPosition(pos)
    obj.getWorldQuaternion(quat)

    // -Y direction in world space = insertion direction per convention
    const negY = new THREE.Vector3(0, -1, 0).applyQuaternion(quat)

    conns.push({ name: obj.name, type, pos, quat, negY })
  })
  return conns
}

// Check a specific landing + guard pair
const landing = await loadModel('landings/arm_01.glb')
const guard = await loadModel('guards/joint_01.glb')

console.log('=== LANDING: arm_01.glb ===')
for (const c of landing) {
  console.log(`  ${c.name} (${c.type}): -Y direction = (${c.negY.x.toFixed(3)}, ${c.negY.y.toFixed(3)}, ${c.negY.z.toFixed(3)})`)
}

console.log('\n=== GUARD: joint_01.glb ===')
for (const c of guard) {
  console.log(`  ${c.name} (${c.type}): -Y direction = (${c.negY.x.toFixed(3)}, ${c.negY.y.toFixed(3)}, ${c.negY.z.toFixed(3)})`)
}

// Check if any pair has opposite -Y directions
console.log('\n=== OPPOSITE CHECK ===')
for (const lc of landing) {
  for (const gc of guard) {
    const dot = lc.negY.dot(gc.negY)
    console.log(`  ${lc.name} · ${gc.name}: dot = ${dot.toFixed(3)} (${dot < -0.5 ? '✅ OPPOSITE' : dot > 0.5 ? '❌ SAME DIR' : '⚠️ PERPENDICULAR'})`)
  }
}

process.exit(0)
