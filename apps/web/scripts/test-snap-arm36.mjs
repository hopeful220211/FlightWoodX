/**
 * Simulate the exact snap calculation for arm_36 → core_hub_01
 * to find where the rotation goes wrong.
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const loader = new GLTFLoader()

async function loadConnectors(relPath) {
  const fp = path.resolve(__dirname, '../public/models', relPath)
  const buf = fs.readFileSync(fp)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const gltf = await new Promise((r, e) => loader.parse(ab, '', r, e))
  const conns = []
  gltf.scene.traverse(obj => {
    const nl = (obj.name || '').toLowerCase()
    let type = null
    if (nl.includes('socket')) type = 'socket'
    else if (nl.includes('plug')) type = 'plug'
    if (!type) return
    const pos = new THREE.Vector3(); obj.getWorldPosition(pos)
    const quat = new THREE.Quaternion(); obj.getWorldQuaternion(quat)
    conns.push({ name: obj.name, type, pos, quat })
  })
  return conns
}

// Load
const hubConns = await loadConnectors('mainboards/core_hub_01.glb')
const armConns = await loadConnectors('landings/arm_36.glb')

// Pick first socket and first plug
const socket = hubConns.find(c => c.type === 'socket')
const plug = armConns.find(c => c.type === 'plug')

console.log('=== Socket (hub) ===')
console.log('  name:', socket.name)
const socketNegY = new THREE.Vector3(0, -1, 0).applyQuaternion(socket.quat)
console.log('  -Y world:', socketNegY.x.toFixed(3), socketNegY.y.toFixed(3), socketNegY.z.toFixed(3))
const socketPosY = new THREE.Vector3(0, 1, 0).applyQuaternion(socket.quat)
console.log('  +Y world:', socketPosY.x.toFixed(3), socketPosY.y.toFixed(3), socketPosY.z.toFixed(3))

console.log('\n=== Plug (arm_36) ===')
console.log('  name:', plug.name)
const plugNegY = new THREE.Vector3(0, -1, 0).applyQuaternion(plug.quat)
console.log('  -Y world:', plugNegY.x.toFixed(3), plugNegY.y.toFixed(3), plugNegY.z.toFixed(3))
const plugPosY = new THREE.Vector3(0, 1, 0).applyQuaternion(plug.quat)
console.log('  +Y world:', plugPosY.x.toFixed(3), plugPosY.y.toFixed(3), plugPosY.z.toFixed(3))

// Simulate computeSnapTransform
// Parent (hub) is at origin, no rotation
const parentPos = new THREE.Vector3(0, 0, 0)
const parentQuat = new THREE.Quaternion() // identity
const socketWorldPos = socket.pos.clone().applyQuaternion(parentQuat).add(parentPos)
const socketWorldQuat = parentQuat.clone().multiply(socket.quat.clone())

// computeSnapTransform
const baseQuaternion = socketWorldQuat.clone().multiply(plug.quat.clone().invert())

// Step 1: rotX180
const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
const facingQuat = baseQuaternion.clone().multiply(rotX180)

// Check: after facingQuat, what's the plug's -Y direction?
const afterFlipPlugNegY = new THREE.Vector3(0, -1, 0).applyQuaternion(facingQuat).applyQuaternion(plug.quat)
console.log('\n=== After rotX180 ===')
console.log('  plug -Y in world (via facingQuat):', afterFlipPlugNegY.x.toFixed(3), afterFlipPlugNegY.y.toFixed(3), afterFlipPlugNegY.z.toFixed(3))
console.log('  socket -Y in world:', socketNegY.x.toFixed(3), socketNegY.y.toFixed(3), socketNegY.z.toFixed(3))
console.log('  dot:', afterFlipPlugNegY.dot(socketNegY).toFixed(3), '(should be -1 for opposite)')

// Step 2: standUp
const sNegY = new THREE.Vector3(0, -1, 0).applyQuaternion(socketWorldQuat)
console.log('\n=== StandUp axis ===')
console.log('  socket -Y for standUp:', sNegY.x.toFixed(3), sNegY.y.toFixed(3), sNegY.z.toFixed(3))
const standUp = new THREE.Quaternion().setFromAxisAngle(sNegY, Math.PI / 2)
const newQuaternion = standUp.clone().multiply(facingQuat)

// Final: what's the child's +Y in world after full transform?
const childWorldPosY = new THREE.Vector3(0, 1, 0).applyQuaternion(newQuaternion)
const childWorldNegY = new THREE.Vector3(0, -1, 0).applyQuaternion(newQuaternion)
console.log('\n=== Final child orientation ===')
console.log('  child +Y world:', childWorldPosY.x.toFixed(3), childWorldPosY.y.toFixed(3), childWorldPosY.z.toFixed(3))
console.log('  child -Y world:', childWorldNegY.x.toFixed(3), childWorldNegY.y.toFixed(3), childWorldNegY.z.toFixed(3))
console.log('  hub   +Y world: 0.000, 1.000, 0.000 (mainboard flat, Y=up)')

// The child's flat surface normal
const childSurfaceNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(newQuaternion)
console.log('  child surface normal:', childSurfaceNormal.x.toFixed(3), childSurfaceNormal.y.toFixed(3), childSurfaceNormal.z.toFixed(3))
console.log('  (should have Y component for vertical insertion)')

process.exit(0)
