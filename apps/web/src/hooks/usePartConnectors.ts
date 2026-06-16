// src/hooks/usePartConnectors.ts
import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

export interface ConnectorInfo {
  id: string
  type: 'socket' | 'plug'
  position: THREE.Vector3
  quaternion: THREE.Quaternion
}

// 模块级缓存：存储已提取的连接点
const connectorCache = new Map<string, ConnectorInfo[]>()

// 模块级缓存：存储已加载的 GLTF 场景（用于同步提取）
const sceneCache = new Map<string, THREE.Group>()

/**
 * 从 GLTF 场景中提取所有连接点
 * @param scene - THREE.Group 对象
 * @returns 连接点数组
 */
const extractConnectorsFromScene = (scene: THREE.Group): ConnectorInfo[] => {
  const connectors: ConnectorInfo[] = []

  scene.traverse((object) => {
    if (!object.isObject3D || !object.name) return

    const objName = object.name.trim()
    let connectorId: string | null = null
    let connectorType: 'socket' | 'plug' | null = null

    // 检查旧格式：SOCKET_xxx 或 PLUG_xxx
    if (objName.startsWith('SOCKET_')) {
      connectorId = objName
      connectorType = 'socket'
    } else if (objName.startsWith('PLUG_')) {
      connectorId = objName
      connectorType = 'plug'
    }
    // 检查新格式：conn_socket_xxx 或 conn_plug_xxx（忽略大小写）
    else if (objName.toLowerCase().startsWith('conn_')) {
      const nameParts = objName.split('_')
      if (nameParts.length >= 3) {
        const type = nameParts[1]?.toLowerCase()
        const id = nameParts.slice(2).join('_')

        if (type === 'socket' || type === 'plug') {
          connectorType = type
          connectorId = type === 'socket' ? `SOCKET_${id}` : `PLUG_${id}`
        }
      }
    }
    // 检查变体格式：socket_xxx 或 plug_xxx (小写开头)
    else if (objName.toLowerCase().startsWith('socket_')) {
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

  return connectors
}

/**
 * React Hook：在组件中使用，自动提取并缓存连接点
 */
export function usePartConnectors(modelUrl: string) {
  const gltfResult = useGLTF(modelUrl)
  const { scene } = gltfResult

  const connectors = useMemo(() => {
    // 如果缓存中已有，直接返回
    if (connectorCache.has(modelUrl)) {
      return connectorCache.get(modelUrl)!
    }

    // 检查 scene 对象是否有效
    if (!scene) {
      console.error(`[usePartConnectors] Scene is null for model: ${modelUrl}`)
      return []
    }

    // 提取连接点
    const foundConnectors = extractConnectorsFromScene(scene)

    // 填充缓存
    connectorCache.set(modelUrl, foundConnectors)
    sceneCache.set(modelUrl, scene)

    if (foundConnectors.length === 0) {
      console.warn(`[usePartConnectors] No connectors found in: ${modelUrl}`)
    }

    return foundConnectors
  }, [scene, modelUrl])

  return connectors
}

/**
 * 同步函数：获取零件的连接点（用于非 React 环境，如 Zustand store）
 * 如果缓存未命中，会尝试同步加载模型并提取连接点
 * @param modelUrl - 模型文件路径
 * @returns 连接点数组，如果加载失败返回空数组
 */
export function getCachedPartConnectors(modelUrl: string): ConnectorInfo[] {
  // 1. 检查连接点缓存
  if (connectorCache.has(modelUrl)) {
    return connectorCache.get(modelUrl)!
  }

  // 2. 检查场景缓存（可能已通过 hook 加载）
  if (sceneCache.has(modelUrl)) {
    const scene = sceneCache.get(modelUrl)!
    const connectors = extractConnectorsFromScene(scene)
    connectorCache.set(modelUrl, connectors)
    return connectors
  }

  // 返回空数组，调用方应处理这种情况
  console.warn(`[getCachedPartConnectors] Model not preloaded: ${modelUrl}`)
  return []
}

/**
 * 异步预加载函数：手动加载 GLB 模型，提取连接点并填充缓存
 * 用于在 usePartConnectors hook 运行之前预加载模型
 * @param modelUrl - 模型文件路径
 */
export const prefetchAndExtractConnectors = async (modelUrl: string) => {
  if (connectorCache.has(modelUrl)) {
    console.log(`[Prefetch] Already cached: ${modelUrl}`)
    return
  }
  
  console.log(`[Prefetch] Starting manual load for: ${modelUrl}`)
  const loader = new GLTFLoader()
  const dracoLoader = new DRACOLoader()
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
  loader.setDRACOLoader(dracoLoader)
  
  try {
    const gltf = await loader.loadAsync(modelUrl)
    const connectors = extractConnectorsFromScene(gltf.scene)
    connectorCache.set(modelUrl, connectors)
    sceneCache.set(modelUrl, gltf.scene)
    console.log(`[Prefetch] Success! Cached ${connectors.length} connectors for ${modelUrl}`)
  } catch (error) {
    console.error(`[Prefetch] Failed to load ${modelUrl}:`, error)
  } finally {
    dracoLoader.dispose()
  }
}
