import { Suspense, useEffect, useCallback } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { SceneContent } from './SceneContent'
import { useDesignStore } from '../../stores/designStore'
import { ActionMenu } from './ActionMenu'
import { SocketHighlights } from './SocketHighlights'
import { CameraController, type CameraView } from './CameraController'
import { partsData } from '../../data/parts'
import { getCachedPartConnectors } from '../../hooks/usePartConnectors'
import { computeSnapTransform, quaternionToEuler } from './snap'
import { checkBeforeAdd } from '../../utils/realtimeChecks'

// 点击检测阈值（像素）
const CLICK_THRESHOLD = 5

import { isConnectionAllowed } from './../../utils/connectionRules'

// 全局指针位置追踪（用于区分点击和拖拽）
let pointerDownPosition: { x: number; y: number } | null = null

interface ThreeCanvasProps {
  cameraView?: CameraView | null
  onCameraViewChanged?: () => void
}

export function ThreeCanvas({ cameraView = null, onCameraViewChanged }: ThreeCanvasProps = {}) {
  const setSelectedInstanceId = useDesignStore((state) => state.setSelectedInstanceId)

  const handlePointerMissed = useCallback((e: MouseEvent) => {
    // 检查是否是真正的点击（而非拖拽）
    if (pointerDownPosition) {
      const dx = Math.abs(e.clientX - pointerDownPosition.x)
      const dy = Math.abs(e.clientY - pointerDownPosition.y)
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < CLICK_THRESHOLD) {
        setSelectedInstanceId(null)
      }
    }
    pointerDownPosition = null
  }, [setSelectedInstanceId])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    pointerDownPosition = { x: e.clientX, y: e.clientY }
  }, [])

  return (
    <Canvas
      shadows
      camera={{
        position: [0.6, 0.6, 0.8], // 更近的视角，让无人机显示更大
        fov: 50,
        near: 0.1,
        far: 1000,
      }}
      style={{ touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMissed={handlePointerMissed}
    >
      {/* 光照 */}
      <ambientLight intensity={1.5} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* 相机控制器 */}
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.5}
        maxDistance={10}
        target={[0, 0, 0]}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />

      {/* 参考网格地面 */}
      <Grid
        position={[0, 0, 0]}
        args={[10, 10]}
        cellSize={0.1}
        cellThickness={1}
        cellColor={'#cccccc'}
        sectionSize={1}
        sectionThickness={1.5}
        sectionColor={'#999999'}
        fadeDistance={15}
        infiniteGrid
      />

      <Suspense fallback={null}>
        <SceneContent />
        <DragHandler />
        <SocketHighlights />
        <CameraController view={cameraView} onViewChanged={onCameraViewChanged} />
        {/* ActionMenu 需要在 Canvas 内部以访问 useThree */}
        <ActionMenu />
      </Suspense>
    </Canvas>
  )
}

// 距离阈值（屏幕像素），小于此距离时高亮插座
const SOCKET_HIGHLIGHT_THRESHOLD = 50

// 拖拽处理器：监听 HTML5 drag and drop 事件
function DragHandler() {
  const setGhostPart = useDesignStore((state) => state.setGhostPart)
  const setHighlightedSocket = useDesignStore((state) => state.setHighlightedSocket)
  const setDraggingPartId = useDesignStore((state) => state.setDraggingPartId)
  const addPartToActiveDesign = useDesignStore((state) => state.addPartToActiveDesign)
  const addPartSmart = useDesignStore((state) => state.addPartSmart)
  const { camera, gl } = useThree()

  useEffect(() => {
    const canvas = gl.domElement

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()

      // 从 store 获取最新状态（dragover 事件中无法通过 dataTransfer.getData 获取数据）
      const currentState = useDesignStore.getState()
      const partId = currentState.draggingPartId
      if (!partId) return

      const currentActiveDesign = currentState.getActiveDesign()
      if (!currentActiveDesign) return

      // 将屏幕坐标转换为3D世界坐标
      const rect = canvas.getBoundingClientRect()

      const vec = new THREE.Vector3(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
        0.5,
      )
      vec.unproject(camera)
      const dir = vec.sub(camera.position).normalize()
      const distance = -camera.position.y / dir.y
      const pos = camera.position.clone().add(dir.multiplyScalar(distance))
      setGhostPart({ partId, position: [pos.x, 0.1, pos.z] })

      const draggingPart = partsData.find((p) => p.id === partId)
      if (!draggingPart) {
        setHighlightedSocket(null)
        return
      }

      // 检查是否是第一个机身（第一个机身不需要连接点）
      if (draggingPart.category === 'mainboard') {
        const existingHub = currentActiveDesign.parts.find((inst) => {
          const p = partsData.find((pd) => pd.id === inst.partId)
          return p?.category === 'mainboard'
        })

        if (!existingHub) {
          // 第一个机身不需要吸附，直接放置即可
          setHighlightedSocket(null)
          return
        }
        // 第二个机身需要连接到现有零件，继续执行下面的逻辑显示连接点
      }

      // 查找拖拽零件的连接器（优先 plug，如果没有则用 socket）
      const draggingConnectors = getCachedPartConnectors(draggingPart.modelUrl)
      const draggingPlugConnector = draggingConnectors.find((c) => c.type === 'plug')
      const draggingSocketConnector = draggingConnectors.find((c) => c.type === 'socket')
      const draggingConnector = draggingPlugConnector || draggingSocketConnector

      if (!draggingConnector) {
        // 没有任何连接器
        setHighlightedSocket(null)
        return
      }

      // 计算已占用的插座
      const occupiedSockets = new Set<string>()
      for (const inst of currentActiveDesign.parts) {
        const at = inst.attachedTo
        if (at?.parentInstanceId && at.parentConnectorId) {
          occupiedSockets.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
        }
      }

      // 计算所有可用插座
      const currentAvailableSockets: Array<{
        instanceId: string
        socketId: string
        plugId: string
        worldPosition: THREE.Vector3
      }> = []

      for (const inst of currentActiveDesign.parts) {
        const partData = partsData.find((p) => p.id === inst.partId)
        if (!partData) continue

        // 检查连接规则：hub和body的插座不能相互连接
        if (!isConnectionAllowed(draggingPart.category, partData.category)) {
          continue
        }

        const connectors = getCachedPartConnectors(partData.modelUrl)

        // 根据拖拽连接器类型过滤目标连接点
        // - 如果拖拽的是 plug：可以连接到 socket 或 plug
        // - 如果拖拽的是 socket：只能连接到 plug（禁止 socket-to-socket）
        const partConnectors = connectors.filter((c) => {
          if (draggingConnector.type === 'plug') {
            // plug 可以连接到 socket 或 plug
            return c.type === 'socket' || c.type === 'plug'
          } else {
            // socket 只能连接到 plug
            return c.type === 'plug'
          }
        })

        const instPos = new THREE.Vector3(...inst.position)
        const instQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...inst.rotation))

        for (const connector of partConnectors) {
          const key = `${inst.instanceId}::${connector.id}`
          if (occupiedSockets.has(key)) continue

          const worldPos = connector.position.clone().applyQuaternion(instQuat).add(instPos)
          currentAvailableSockets.push({
            instanceId: inst.instanceId,
            socketId: connector.id,
            plugId: draggingConnector.id,
            worldPosition: worldPos,
          })
        }
      }

      // 计算最近的插座
      if (currentAvailableSockets.length > 0) {
        let nearestSocket: typeof currentAvailableSockets[0] | null = null
        let minScreenDistance = Infinity

        for (const socket of currentAvailableSockets) {
          // 将插座世界坐标转换为屏幕坐标
          const screenPos = socket.worldPosition.clone().project(camera)
          const screenX = (screenPos.x * 0.5 + 0.5) * rect.width + rect.left
          const screenY = (-screenPos.y * 0.5 + 0.5) * rect.height + rect.top

          // 计算鼠标与插座的屏幕距离
          const dx = e.clientX - screenX
          const dy = e.clientY - screenY
          const screenDistance = Math.sqrt(dx * dx + dy * dy)

          if (screenDistance < minScreenDistance) {
            minScreenDistance = screenDistance
            nearestSocket = socket
          }
        }

        // 如果最近的插座在阈值范围内，高亮它
        if (nearestSocket && minScreenDistance < SOCKET_HIGHLIGHT_THRESHOLD) {
          setHighlightedSocket({
            instanceId: nearestSocket.instanceId,
            socketId: nearestSocket.socketId,
            plugId: nearestSocket.plugId,
          })
        } else {
          setHighlightedSocket(null)
        }
      } else {
        setHighlightedSocket(null)
      }
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      const partId = e.dataTransfer?.getData('text/plain')
      if (partId) {
        // 从 store 获取最新状态（避免闭包中的旧值）
        const currentState = useDesignStore.getState()
        const currentHighlightedSocket = currentState.highlightedSocket
        const currentActiveDesign = currentState.getActiveDesign()

        // Real-time constraint check before any placement
        if (currentActiveDesign) {
          const childPart = partsData.find((p) => p.id === partId)
          if (childPart) {
            const violation = checkBeforeAdd(childPart.category, childPart.id, currentActiveDesign.parts)
            if (violation) {
              console.warn(`[Drop] Blocked: ${violation.message}`)
              setGhostPart(null)
              setHighlightedSocket(null)
              setDraggingPartId(null)
              // Dispatch custom event for ViolationBubble
              window.dispatchEvent(new CustomEvent('fwx-violation', { detail: violation }))
              return
            }
          }
        }

        // 如果有高亮的插座，则精确吸附
        if (currentHighlightedSocket && currentActiveDesign) {
          const childPart = partsData.find((p) => p.id === partId)
          const parentInst = currentActiveDesign.parts.find((p) => p.instanceId === currentHighlightedSocket.instanceId)
          const parentPart = parentInst ? partsData.find((p) => p.id === parentInst.partId) : null

          if (childPart && parentInst && parentPart) {
            // 验证连接是否允许
            if (!isConnectionAllowed(childPart.category, parentPart.category)) {
              console.warn(`[Drop] Connection not allowed: ${childPart.category} -> ${parentPart.category}`)
              // 回退到智能添加（会找到合法的插座）
              addPartSmart(partId)
              setGhostPart(null)
              setHighlightedSocket(null)
              setDraggingPartId(null)
              return
            }
            const childConnectors = getCachedPartConnectors(childPart.modelUrl)
            const parentConnectors = getCachedPartConnectors(parentPart.modelUrl)

            const plug = childConnectors?.find((c) => c.id === currentHighlightedSocket.plugId) ?? null
            const socket = parentConnectors?.find((c) => c.id === currentHighlightedSocket.socketId) ?? null

            if (plug && socket) {
              const parentPos = new THREE.Vector3(...parentInst.position)
              const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...parentInst.rotation))
              const socketWorldPosition = socket.position.clone().applyQuaternion(parentQuat).add(parentPos)
              const socketWorldQuaternion = parentQuat.clone().multiply(socket.quaternion.clone())

              // 使用基础对齐
              const { quaternion: baseQuaternion } = computeSnapTransform({
                socketWorldPosition,
                socketWorldQuaternion,
                plugLocalPosition: plug.position,
                plugLocalQuaternion: plug.quaternion,
              })

              // 额外旋转：先绕X轴旋转180度，再绕Z轴旋转90度（与 addPartSmart 保持一致）
              const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
              const rotZ90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
              const extraRotation = rotX180.clone().multiply(rotZ90)

              const newQuaternion = baseQuaternion.clone().multiply(extraRotation)

              // 重新计算位置（因为旋转改变后，插头偏移也要重新计算）
              const plugOffsetRotated = plug.position.clone().applyQuaternion(newQuaternion)
              const newPosition = socketWorldPosition.clone().sub(plugOffsetRotated)

              addPartToActiveDesign({
                partId,
                category: childPart.category,
                position: [newPosition.x, newPosition.y, newPosition.z],
                rotation: quaternionToEuler(newQuaternion),
                activeConnectorId: currentHighlightedSocket.plugId,
                attachedTo: {
                  parentInstanceId: currentHighlightedSocket.instanceId,
                  parentConnectorId: currentHighlightedSocket.socketId,
                },
              })
            } else {
              // plug 或 socket 未找到，回退到智能添加
              addPartSmart(partId)
            }
          } else {
            // 零件信息未找到，回退到智能添加
            addPartSmart(partId)
          }
        } else {
          // 如果没有高亮插座，使用智能添加方法（会自动放在中心或吸附到可用插座）
          addPartSmart(partId)
        }
        setGhostPart(null)
        setHighlightedSocket(null)
        setDraggingPartId(null)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      // 只有当真正离开画布时才清除状态
      const rect = canvas.getBoundingClientRect()
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        setGhostPart(null)
        setHighlightedSocket(null)
      }
    }

    // 触控拖拽移动处理
    const handleTouchDragMove = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; partId: string }>
      const { x, y, partId } = customEvent.detail

      const currentState = useDesignStore.getState()
      const currentActiveDesign = currentState.getActiveDesign()
      if (!currentActiveDesign) return

      // 将屏幕坐标转换为3D世界坐标
      const rect = canvas.getBoundingClientRect()

      const vec = new THREE.Vector3(
        ((x - rect.left) / rect.width) * 2 - 1,
        -((y - rect.top) / rect.height) * 2 + 1,
        0.5,
      )
      vec.unproject(camera)
      const dir = vec.sub(camera.position).normalize()
      const distance = -camera.position.y / dir.y
      const pos = camera.position.clone().add(dir.multiplyScalar(distance))
      setGhostPart({ partId, position: [pos.x, 0.1, pos.z] })

      const draggingPart = partsData.find((p) => p.id === partId)
      if (!draggingPart) {
        setHighlightedSocket(null)
        return
      }

      // 检查是否是第一个机身（第一个机身不需要连接点）
      if (draggingPart.category === 'mainboard') {
        const existingHub = currentActiveDesign.parts.find((inst) => {
          const p = partsData.find((pd) => pd.id === inst.partId)
          return p?.category === 'mainboard'
        })

        if (!existingHub) {
          // 第一个机身不需要吸附，直接放置即可
          setHighlightedSocket(null)
          return
        }
        // 第二个机身需要连接到现有零件，继续执行下面的逻辑显示连接点
      }

      // 查找拖拽零件的连接器（优先 plug，如果没有则用 socket）
      const draggingConnectors = getCachedPartConnectors(draggingPart.modelUrl)
      const draggingPlugConnector = draggingConnectors.find((c) => c.type === 'plug')
      const draggingSocketConnector = draggingConnectors.find((c) => c.type === 'socket')
      const draggingConnector = draggingPlugConnector || draggingSocketConnector

      if (!draggingConnector) {
        // 没有任何连接器
        setHighlightedSocket(null)
        return
      }

      // 计算已占用的插座
      const occupiedSockets = new Set<string>()
      for (const inst of currentActiveDesign.parts) {
        const at = inst.attachedTo
        if (at?.parentInstanceId && at.parentConnectorId) {
          occupiedSockets.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
        }
      }

      // 计算所有可用插座
      const currentAvailableSockets: Array<{
        instanceId: string
        socketId: string
        plugId: string
        worldPosition: THREE.Vector3
      }> = []

      for (const inst of currentActiveDesign.parts) {
        const partData = partsData.find((p) => p.id === inst.partId)
        if (!partData) continue

        // 检查连接规则：hub和body的插座不能相互连接
        if (!isConnectionAllowed(draggingPart.category, partData.category)) {
          continue
        }

        const connectors = getCachedPartConnectors(partData.modelUrl)

        // 根据拖拽连接器类型过滤目标连接点
        // - 如果拖拽的是 plug：可以连接到 socket 或 plug
        // - 如果拖拽的是 socket：只能连接到 plug（禁止 socket-to-socket）
        const partConnectors = connectors.filter((c) => {
          if (draggingConnector.type === 'plug') {
            // plug 可以连接到 socket 或 plug
            return c.type === 'socket' || c.type === 'plug'
          } else {
            // socket 只能连接到 plug
            return c.type === 'plug'
          }
        })

        const instPos = new THREE.Vector3(...inst.position)
        const instQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...inst.rotation))

        for (const connector of partConnectors) {
          const key = `${inst.instanceId}::${connector.id}`
          if (occupiedSockets.has(key)) continue

          const worldPos = connector.position.clone().applyQuaternion(instQuat).add(instPos)
          currentAvailableSockets.push({
            instanceId: inst.instanceId,
            socketId: connector.id,
            plugId: draggingConnector.id,
            worldPosition: worldPos,
          })
        }
      }

      // 计算最近的插座
      if (currentAvailableSockets.length > 0) {
        let nearestSocket: typeof currentAvailableSockets[0] | null = null
        let minScreenDistance = Infinity

        for (const socket of currentAvailableSockets) {
          const screenPos = socket.worldPosition.clone().project(camera)
          const screenX = (screenPos.x * 0.5 + 0.5) * rect.width + rect.left
          const screenY = (-screenPos.y * 0.5 + 0.5) * rect.height + rect.top

          const dx = x - screenX
          const dy = y - screenY
          const screenDistance = Math.sqrt(dx * dx + dy * dy)

          if (screenDistance < minScreenDistance) {
            minScreenDistance = screenDistance
            nearestSocket = socket
          }
        }

        if (nearestSocket && minScreenDistance < SOCKET_HIGHLIGHT_THRESHOLD) {
          setHighlightedSocket({
            instanceId: nearestSocket.instanceId,
            socketId: nearestSocket.socketId,
            plugId: nearestSocket.plugId,
          })
        } else {
          setHighlightedSocket(null)
        }
      } else {
        setHighlightedSocket(null)
      }
    }

    // 触控拖拽结束处理
    const handleTouchDragEnd = (e: Event) => {
      const customEvent = e as CustomEvent<{ x: number; y: number; partId: string }>
      const { partId } = customEvent.detail

      // 从 store 获取最新状态
      const currentState = useDesignStore.getState()
      const currentHighlightedSocket = currentState.highlightedSocket
      const currentActiveDesign = currentState.getActiveDesign()

      // Real-time constraint check (touch path)
      if (currentActiveDesign) {
        const touchChildPart = partsData.find((p) => p.id === partId)
        if (touchChildPart) {
          const v = checkBeforeAdd(touchChildPart.category, touchChildPart.id, currentActiveDesign.parts)
          if (v) {
            console.warn(`[TouchDrop] Blocked: ${v.message}`)
            setGhostPart(null)
            setHighlightedSocket(null)
            setDraggingPartId(null)
            window.dispatchEvent(new CustomEvent('fwx-violation', { detail: v }))
            return
          }
        }
      }

      if (currentHighlightedSocket && currentActiveDesign) {
        const childPart = partsData.find((p) => p.id === partId)
        const parentInst = currentActiveDesign.parts.find((p) => p.instanceId === currentHighlightedSocket.instanceId)
        const parentPart = parentInst ? partsData.find((p) => p.id === parentInst.partId) : null

        if (childPart && parentInst && parentPart) {
          // 验证连接是否允许
          if (!isConnectionAllowed(childPart.category, parentPart.category)) {
            console.warn(`[Touch Drop] Connection not allowed: ${childPart.category} -> ${parentPart.category}`)
            // 回退到智能添加（会找到合法的插座）
            addPartSmart(partId)
            setGhostPart(null)
            setHighlightedSocket(null)
            setDraggingPartId(null)
            return
          }
          const childConnectors = getCachedPartConnectors(childPart.modelUrl)
          const parentConnectors = getCachedPartConnectors(parentPart.modelUrl)

          const plug = childConnectors?.find((c) => c.id === currentHighlightedSocket.plugId) ?? null
          const socket = parentConnectors?.find((c) => c.id === currentHighlightedSocket.socketId) ?? null

          if (plug && socket) {
            const parentPos = new THREE.Vector3(...parentInst.position)
            const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...parentInst.rotation))
            const socketWorldPosition = socket.position.clone().applyQuaternion(parentQuat).add(parentPos)
            const socketWorldQuaternion = parentQuat.clone().multiply(socket.quaternion.clone())

            const { quaternion: baseQuaternion } = computeSnapTransform({
              socketWorldPosition,
              socketWorldQuaternion,
              plugLocalPosition: plug.position,
              plugLocalQuaternion: plug.quaternion,
            })

            const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
            const rotZ90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
            const extraRotation = rotX180.clone().multiply(rotZ90)

            const newQuaternion = baseQuaternion.clone().multiply(extraRotation)
            const plugOffsetRotated = plug.position.clone().applyQuaternion(newQuaternion)
            const newPosition = socketWorldPosition.clone().sub(plugOffsetRotated)

            addPartToActiveDesign({
              partId,
              category: childPart.category,
              position: [newPosition.x, newPosition.y, newPosition.z],
              rotation: quaternionToEuler(newQuaternion),
              activeConnectorId: currentHighlightedSocket.plugId,
              attachedTo: {
                parentInstanceId: currentHighlightedSocket.instanceId,
                parentConnectorId: currentHighlightedSocket.socketId,
              },
            })
          } else {
            addPartSmart(partId)
          }
        } else {
          addPartSmart(partId)
        }
      } else {
        addPartSmart(partId)
      }

      setGhostPart(null)
      setHighlightedSocket(null)
      setDraggingPartId(null)
    }

    canvas.addEventListener('dragover', handleDragOver)
    canvas.addEventListener('drop', handleDrop)
    canvas.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('touchDragMove', handleTouchDragMove)
    window.addEventListener('touchDragEnd', handleTouchDragEnd)

    return () => {
      canvas.removeEventListener('dragover', handleDragOver)
      canvas.removeEventListener('drop', handleDrop)
      canvas.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('touchDragMove', handleTouchDragMove)
      window.removeEventListener('touchDragEnd', handleTouchDragEnd)
    }
  }, [camera, gl, setGhostPart, setHighlightedSocket, setDraggingPartId, addPartToActiveDesign, addPartSmart])

  return null
}
