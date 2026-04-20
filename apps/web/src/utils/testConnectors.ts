// 测试工具：检查模型的连接点
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import * as THREE from 'three'

interface ConnectorInfo {
  id: string
  type: 'socket' | 'plug'
  position: THREE.Vector3
  quaternion: THREE.Quaternion
}

export async function testModelConnectors(modelUrl: string): Promise<void> {
  console.log(`\n========================================`)
  console.log(`测试模型: ${modelUrl}`)
  console.log(`========================================\n`)

  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  loader.setDRACOLoader(dracoLoader)

  try {
    const gltf = await loader.loadAsync(modelUrl)
    console.log(`✅ 模型加载成功`)
    console.log(`场景对象:`, gltf.scene)

    const connectors: ConnectorInfo[] = []
    const allObjects: string[] = []

    // 遍历所有对象
    gltf.scene.traverse((object) => {
      const name = object.name || '(unnamed)'
      allObjects.push(`${name} (${object.type})`)

      if (!object.isObject3D || !object.name) return

      const objName = object.name.trim()
      let connectorId: string | null = null
      let connectorType: 'socket' | 'plug' | null = null

      // 检查各种格式
      if (objName.startsWith('SOCKET_')) {
        connectorId = objName
        connectorType = 'socket'
      } else if (objName.startsWith('PLUG_')) {
        connectorId = objName
        connectorType = 'plug'
      } else if (objName.toLowerCase().startsWith('conn_')) {
        const nameParts = objName.split('_')
        if (nameParts.length >= 3) {
          const type = nameParts[1]?.toLowerCase()
          const id = nameParts.slice(2).join('_')

          if (type === 'socket' || type === 'plug') {
            connectorType = type
            connectorId = type === 'socket' ? `SOCKET_${id}` : `PLUG_${id}`
          }
        }
      } else if (objName.toLowerCase().startsWith('socket_')) {
        const id = objName.substring(7)
        connectorId = `SOCKET_${id}`
        connectorType = 'socket'
      } else if (objName.toLowerCase().startsWith('plug_')) {
        const id = objName.substring(5)
        connectorId = `PLUG_${id}`
        connectorType = 'plug'
      }

      if (connectorId && connectorType) {
        const position = new THREE.Vector3()
        const quaternion = new THREE.Quaternion()
        object.getWorldPosition(position)
        object.getWorldQuaternion(quaternion)

        connectors.push({
          id: connectorId,
          type: connectorType,
          position,
          quaternion,
        })
      }
    })

    console.log(`\n📊 场景中的所有对象 (共 ${allObjects.length} 个):`)
    allObjects.forEach((obj, idx) => {
      console.log(`  ${idx + 1}. ${obj}`)
    })

    console.log(`\n🔌 找到的连接点 (共 ${connectors.length} 个):`)
    if (connectors.length > 0) {
      connectors.forEach((conn, idx) => {
        console.log(`  ${idx + 1}. ${conn.id}`)
        console.log(`     类型: ${conn.type}`)
        console.log(`     位置: [${conn.position.x.toFixed(3)}, ${conn.position.y.toFixed(3)}, ${conn.position.z.toFixed(3)}]`)
        console.log(`     旋转: [${conn.quaternion.x.toFixed(3)}, ${conn.quaternion.y.toFixed(3)}, ${conn.quaternion.z.toFixed(3)}, ${conn.quaternion.w.toFixed(3)}]`)
      })
    } else {
      console.warn(`  ⚠️ 未找到任何连接点！`)
      console.log(`\n💡 请确保空物体命名格式正确:`)
      console.log(`   - conn_socket_01, conn_socket_02, ... (用于接收其他零件)`)
      console.log(`   - conn_plug_01, conn_plug_02, ... (用于连接到其他零件)`)
    }

    console.log(`\n========================================\n`)

  } catch (error) {
    console.error(`❌ 模型加载失败:`, error)
  } finally {
    dracoLoader.dispose()
  }
}

// 在浏览器控制台中使用：
// import { testModelConnectors } from './utils/testConnectors'
// testModelConnectors('/models/core_plate_02.glb')
// testModelConnectors('/models/arm_02.glb')
