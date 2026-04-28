import fs from 'fs'
import path from 'path'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const loader = new GLTFLoader()
async function getPlugDirs(relPath) {
  const fp = path.resolve('/Users/nesty/Projects/flightwoodx/apps/web/public/models', relPath)
  const buf = fs.readFileSync(fp)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  const gltf = await new Promise((r,e) => loader.parse(ab,'',r,e))
  const res = []
  gltf.scene.traverse(o => {
    const nl = (o.name||'').toLowerCase()
    if (!nl.includes('plug_') && !nl.includes('socket_')) return
    const q = new THREE.Quaternion(); o.getWorldQuaternion(q)
    const negY = new THREE.Vector3(0,-1,0).applyQuaternion(q)
    res.push({ name: o.name, type: nl.includes('plug') ? 'plug' : 'socket', dir: `(${negY.x.toFixed(2)}, ${negY.y.toFixed(2)}, ${negY.z.toFixed(2)})` })
  })
  return res
}
const pairs = [
  ['landings/arm_05.glb', 'guards/joint_03.glb'],
  ['landings/arm_10.glb', 'guards/joint_11.glb'],
  ['landings/arm_20.glb', 'guards/joint_32.glb'],
]
for (const [l,g] of pairs) {
  const lc = await getPlugDirs(l)
  const gc = await getPlugDirs(g)
  console.log(`\n${l}: ${lc.map(c=>`${c.name}(${c.type})=${c.dir}`).join(', ')}`)
  console.log(`${g}: ${gc.map(c=>`${c.name}(${c.type})=${c.dir}`).join(', ')}`)
}
process.exit(0)
