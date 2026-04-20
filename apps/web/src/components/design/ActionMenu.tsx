// src/components/design/ActionMenu.tsx
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useDesignStore } from '../../stores/designStore'
import { Trash2, FlipVertical2, Repeat } from 'lucide-react'
import { partsData } from '../../data/parts'
import { getCachedPartConnectors } from '../../hooks/usePartConnectors'
import { computeSnapTransform, quaternionToEuler } from './snap'

export function ActionMenu() {
  const selectedInstanceId = useDesignStore((state) => state.selectedInstanceId)
  const activeDesign = useDesignStore((state) => state.getActiveDesign())
  const removePartFromActiveDesign = useDesignStore((state) => state.removePartFromActiveDesign)
  const updatePartInActiveDesign = useDesignStore((state) => state.updatePartInActiveDesign)
  const setSelectedInstanceId = useDesignStore((state) => state.setSelectedInstanceId)

  if (!selectedInstanceId || !activeDesign) return null

  const instance = activeDesign.parts.find((p) => p.instanceId === selectedInstanceId)
  if (!instance) return null

  // Position menu above the selected part
  const menuPosition: [number, number, number] = [
    instance.position[0],
    instance.position[1] + 0.08,
    instance.position[2],
  ]

  const handleDelete = () => {
    removePartFromActiveDesign(selectedInstanceId)
    setSelectedInstanceId(null)
  }

  const handleFlip = () => {
    // 绕连接点的局部Z轴旋转180度
    if (!instance.attachedTo) {
      // 如果没有连接到父零件（如机身），则绕自身Z轴旋转
      const currentRotation = instance.rotation || [0, 0, 0]
      const currentQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(currentRotation[0], currentRotation[1], currentRotation[2])
      )
      const flipQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI)
      const newQuat = currentQuat.clone().multiply(flipQuat)
      const newEuler = new THREE.Euler().setFromQuaternion(newQuat, 'XYZ')
      updatePartInActiveDesign(selectedInstanceId, {
        rotation: [newEuler.x, newEuler.y, newEuler.z]
      })
      return
    }

    // 获取父零件和连接点信息
    const parentInst = activeDesign.parts.find((p) => p.instanceId === instance.attachedTo?.parentInstanceId)
    const parentPart = parentInst ? partsData.find((p) => p.id === parentInst.partId) : null
    if (!parentInst || !parentPart) return

    const parentConns = getCachedPartConnectors(parentPart.modelUrl) ?? []
    const socket = parentConns.find((c) => c.id === instance.attachedTo?.parentConnectorId) ?? null
    if (!socket) return

    // 计算连接点的世界坐标（作为旋转中心）
    const parentPos = new THREE.Vector3(...parentInst.position)
    const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...parentInst.rotation))
    const pivotPoint = socket.position.clone().applyQuaternion(parentQuat).add(parentPos)

    // 当前零件的位置和旋转
    const currentPos = new THREE.Vector3(...instance.position)
    const currentRotation = instance.rotation || [0, 0, 0]
    const currentQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(currentRotation[0], currentRotation[1], currentRotation[2])
    )

    // 获取零件自身的局部Z轴（世界坐标系中的方向）
    const partLocalZ = new THREE.Vector3(0, 0, 1).applyQuaternion(currentQuat)

    // 绕零件自身的局部Z轴旋转180度（以连接点为中心）
    const flipQuat = new THREE.Quaternion().setFromAxisAngle(partLocalZ, Math.PI)

    // 计算新位置：绕零件局部Z轴旋转，以连接点为中心
    // newPos = pivot + flipQuat * (currentPos - pivot)
    const relativePos = currentPos.clone().sub(pivotPoint)
    const rotatedRelativePos = relativePos.applyQuaternion(flipQuat)
    const newPos = pivotPoint.clone().add(rotatedRelativePos)

    // 计算新旋转
    const newQuat = flipQuat.clone().multiply(currentQuat)
    const newEuler = new THREE.Euler().setFromQuaternion(newQuat, 'XYZ')

    updatePartInActiveDesign(selectedInstanceId, {
      position: [newPos.x, newPos.y, newPos.z],
      rotation: [newEuler.x, newEuler.y, newEuler.z],
    })
  }

  const handleSwitchConnector = () => {
    if (!selectedInstanceId || !activeDesign) return
    const inst = activeDesign.parts.find((p) => p.instanceId === selectedInstanceId)
    if (!inst?.attachedTo) return

    const part = partsData.find((p) => p.id === inst.partId)
    const parentInst = activeDesign.parts.find((p) => p.instanceId === inst.attachedTo?.parentInstanceId)
    const parentPart = parentInst ? partsData.find((p) => p.id === parentInst.partId) : null
    if (!part || !parentInst || !parentPart) return

    const childConns = getCachedPartConnectors(part.modelUrl)
    const plugs = childConns.filter((c) => c.type === 'plug')
    if (!plugs.length) return

    const currentId = inst.activeConnectorId ?? plugs[0]!.id
    const idx = Math.max(0, plugs.findIndex((p) => p.id === currentId))
    const nextPlug = plugs[(idx + 1) % plugs.length]!

    const parentConns = getCachedPartConnectors(parentPart.modelUrl) ?? []
    const socket = parentConns.find((c) => c.id === inst.attachedTo?.parentConnectorId) ?? null
    if (!socket) return

    const parentPos = new THREE.Vector3(...parentInst.position)
    const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...parentInst.rotation))
    const socketWorldPosition = socket.position.clone().applyQuaternion(parentQuat).add(parentPos)
    const socketWorldQuaternion = parentQuat.clone().multiply(socket.quaternion.clone())

    // 使用基础对齐
    const { quaternion: baseQuaternion } = computeSnapTransform({
      socketWorldPosition,
      socketWorldQuaternion,
      plugLocalPosition: nextPlug.position,
      plugLocalQuaternion: nextPlug.quaternion,
    })

    // 额外旋转：先绕X轴旋转180度，再绕Z轴旋转90度（与添加零件时保持一致）
    const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
    const rotZ90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
    const extraRotation = rotX180.clone().multiply(rotZ90)

    const newQuaternion = baseQuaternion.clone().multiply(extraRotation)

    // 重新计算位置（因为旋转改变后，插头偏移也要重新计算）
    const plugOffsetRotated = nextPlug.position.clone().applyQuaternion(newQuaternion)
    const newPosition = socketWorldPosition.clone().sub(plugOffsetRotated)

    updatePartInActiveDesign(selectedInstanceId, {
      activeConnectorId: nextPlug.id,
      position: [newPosition.x, newPosition.y, newPosition.z],
      rotation: quaternionToEuler(newQuaternion),
    })
  }

  // 使用<Html>组件将2D UI包裹起来，安全地在3D场景中渲染
  return (
    <Html position={menuPosition} center zIndexRange={[100, 0]} style={{ pointerEvents: 'auto' }}>
      <div
        className="flex items-center gap-1 p-1.5 bg-white/95 rounded-full shadow-lg border border-amber-100"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleDelete}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-red-50 text-gray-600 hover:text-red-500 transition-colors"
          title="删除"
        >
          <Trash2 size={18} />
        </button>
        <button
          onClick={handleFlip}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-amber-50 text-gray-600 hover:text-amber-600 transition-colors"
          title="翻转"
        >
          <FlipVertical2 size={18} />
        </button>
        <button
          onClick={handleSwitchConnector}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-amber-50 text-gray-600 hover:text-amber-600 transition-colors"
          title="更换连接点"
        >
          <Repeat size={18} />
        </button>
      </div>
    </Html>
  )
}
