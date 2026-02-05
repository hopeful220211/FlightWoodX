// src/stores/designStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Design, PartInstance } from '../types/design'
import { STORAGE_KEYS } from '../constants/storageKeys'
import { partsData } from '../data/parts'
import { getCachedPartConnectors } from '../hooks/usePartConnectors'
import * as THREE from 'three'
import { computeSnapTransform, quaternionToEuler } from '../components/design/snap'

interface DesignState {
  designs: Design[]
  activeDesignId: string | null
  getDesignById: (id: string) => Design | undefined
  createDesign: (name: string) => string
  deleteDesign: (id: string) => void
  setActiveDesignId: (id: string | null) => void
  getActiveDesign: () => Design | undefined
  // --- 新增方法 ---
  addPartToActiveDesign: (part: Omit<PartInstance, 'instanceId'>) => void
  removePartFromActiveDesign: (instanceId: string) => void
  updatePartInActiveDesign: (instanceId: string, updates: Partial<PartInstance>) => void
  // --- 拖拽和交互状态 ---
  selectedInstanceId: string | null
  ghostPart: { partId: string; position: [number, number, number] } | null
  highlightedSocket: { instanceId: string; socketId: string; plugId: string } | null
  draggingPartId: string | null  // 当前正在拖拽的零件ID
  setSelectedInstanceId: (id: string | null) => void
  setGhostPart: (ghost: { partId: string; position: [number, number, number] } | null) => void
  setHighlightedSocket: (socket: { instanceId: string; socketId: string; plugId: string } | null) => void
  setDraggingPartId: (partId: string | null) => void
  /** 智能添加零件（根据 category 决定初始位置与吸附逻辑） */
  addPartSmart: (partId: string) => void
}

export const useDesignStore = create<DesignState>()(
  persist(
    (set, get) => ({
      designs: [],
      activeDesignId: null,
      selectedInstanceId: null,
      ghostPart: null,
      highlightedSocket: null,
      draggingPartId: null,
      getDesignById: (id) => get().designs.find((d) => d.id === id),
      createDesign: (name) => {
        const newId = `design-${Date.now()}`
        const newDesign: Design = {
          id: newId,
          name,
          updatedAt: new Date().toISOString(),
          parts: [],
        }
        set((state) => ({ designs: [...state.designs, newDesign] }))
        return newId
      },
      deleteDesign: (id) => {
        set((state) => ({ designs: state.designs.filter((d) => d.id !== id) }))
      },
      setActiveDesignId: (id) => set({ activeDesignId: id }),
      getActiveDesign: () => {
        const activeId = get().activeDesignId
        if (!activeId) return undefined
        return get().designs.find((d) => d.id === activeId)
      },
      // --- 新增方法实现 ---
      addPartToActiveDesign: (part) => {
        const newInstance: PartInstance = {
          ...part,
          instanceId: `inst-${Date.now()}`,
        }
        set((state) => {
          const activeId = state.activeDesignId
          if (!activeId) return state
          return {
            designs: state.designs.map((d) =>
              d.id === activeId
                ? { ...d, parts: [...d.parts, newInstance], updatedAt: new Date().toISOString() }
                : d,
            ),
          }
        })
      },
      removePartFromActiveDesign: (instanceId) => {
        set((state) => {
          const activeId = state.activeDesignId
          if (!activeId) return state
          return {
            designs: state.designs.map((d) =>
              d.id === activeId
                ? {
                    ...d,
                    parts: d.parts.filter((p) => p.instanceId !== instanceId),
                    updatedAt: new Date().toISOString(),
                  }
                : d,
            ),
          }
        })
      },
      updatePartInActiveDesign: (instanceId, updates) => {
        set((state) => {
          const activeId = state.activeDesignId
          if (!activeId) return state
          return {
            designs: state.designs.map((d) =>
              d.id === activeId
                ? {
                    ...d,
                    parts: d.parts.map((p) => (p.instanceId === instanceId ? { ...p, ...updates } : p)),
                    updatedAt: new Date().toISOString(),
                  }
                : d,
            ),
          }
        })
      },
      setSelectedInstanceId: (id) => set({ selectedInstanceId: id }),
      setGhostPart: (ghost) => set({ ghostPart: ghost }),
      setHighlightedSocket: (socket) => set({ highlightedSocket: socket }),
      setDraggingPartId: (partId) => set({ draggingPartId: partId }),
      addPartSmart: (partId) => {
        const state = get()
        const activeDesign = state.getActiveDesign()
        if (!activeDesign) return

        const partData = partsData.find((p) => p.id === partId)
        if (!partData) {
          console.error(`Part with id ${partId} not found in partsData.`)
          return
        }

        // 规则 1：body 直接放到场景中心，但场上只能有一个机身
        if (partData.category === 'body') {
          // 检查是否已存在机身
          const existingBody = activeDesign.parts.find((inst) => {
            const p = partsData.find((pd) => pd.id === inst.partId)
            return p?.category === 'body'
          })
          if (existingBody) {
            // eslint-disable-next-line no-alert
            alert('场上只能存在一个机身，请先删除现有机身后再添加。')
            return
          }
          state.addPartToActiveDesign({
            partId,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
          })
          return
        }

        // 规则 2：非 body 必须先有主板
        const hasBody = activeDesign.parts.some((inst) => {
          const p = partsData.find((pd) => pd.id === inst.partId)
          return p?.category === 'body'
        })
        if (!hasBody) {
          // eslint-disable-next-line no-alert
          alert('请先添加主板。')
          return
        }

        // 计算已占用的 SOCKET
        const occupied = new Set<string>()
        for (const inst of activeDesign.parts) {
          const at = inst.attachedTo
          if (at?.parentInstanceId && at.parentConnectorId) {
            occupied.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
          }
        }

        // 寻找第一个空闲 SOCKET（使用简化的逻辑）
        console.log('--- [Find Socket] Starting ---')
        console.log(`[Find Socket] Current parts in scene: ${activeDesign.parts.length}`)

        // 找到 body 类型的零件
        const bodyInstance = activeDesign.parts.find((inst) => {
          const p = partsData.find((pd) => pd.id === inst.partId)
          return p?.category === 'body'
        })

        if (!bodyInstance) {
          console.error('[Find Socket] EXIT: No body part found.')
          // eslint-disable-next-line no-alert
          alert('请先添加主板。')
          return
        }

        const bodyPartInfo = partsData.find((p) => p.id === bodyInstance.partId)
        if (!bodyPartInfo) {
          console.error('[Find Socket] EXIT: Body part info not found.')
          return
        }

        // 直接调用可靠的工具函数
        const allConnectors = getCachedPartConnectors(bodyPartInfo.modelUrl)
        const sockets = allConnectors.filter((c) => c.type === 'socket')

        console.log(`[Find Socket] Found ${sockets.length} total sockets in body model.`)

        // 计算已占用的插座ID
        const occupiedSocketIds = new Set<string>()
        for (const inst of activeDesign.parts) {
          const at = inst.attachedTo
          if (at?.parentInstanceId === bodyInstance.instanceId && at.parentConnectorId) {
            occupiedSocketIds.add(at.parentConnectorId)
          }
        }

        const availableSocket = sockets.find((socket) => !occupiedSocketIds.has(socket.id))

        if (!availableSocket) {
          console.error('[Find Socket] FAILURE: All sockets are occupied or none were found.')
          // eslint-disable-next-line no-alert
          alert('没有可用的连接点。')
          return
        }

        console.log(`[Find Socket] SUCCESS: Found available socket: ${availableSocket.id}`)
        const targetParent = bodyInstance
        const targetSocketId = availableSocket.id

        // 找到新零件的第一个 PLUG
        const childConns = getCachedPartConnectors(partData.modelUrl)
        const plug = childConns.find((c) => c.type === 'plug')
        if (!plug) {
          console.error('[Find Socket] EXIT: No plug found in child part.')
          // eslint-disable-next-line no-alert
          alert('该零件没有可用的连接插头。')
          return
        }

        // ✅ 对齐计算：使用新的 calculateSnapTransform 函数
        const parentPart = partsData.find((p) => p.id === targetParent.partId)
        if (!parentPart) {
          console.error('[Add Part] Parent part not found.')
          return
        }
        const parentConns = getCachedPartConnectors(parentPart.modelUrl)
        const socket = parentConns.find((c) => c.id === targetSocketId)
        if (!socket) {
          console.error('[Add Part] Socket not found in parent connectors.')
          return
        }

        // 计算插座的世界坐标变换
        const parentPos = new THREE.Vector3(...targetParent.position)
        const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetParent.rotation))
        const socketWorldPosition = socket.position.clone().applyQuaternion(parentQuat).add(parentPos)
        const socketWorldQuaternion = parentQuat.clone().multiply(socket.quaternion.clone())

        // 插头的本地变换（已经是相对于子零件的）
        const plugLocalPosition = plug.position.clone()
        const plugLocalQuaternion = plug.quaternion.clone()

        // 使用 computeSnapTransform 函数计算基础对齐
        const { quaternion: baseQuaternion } = computeSnapTransform({
          socketWorldPosition,
          socketWorldQuaternion,
          plugLocalPosition,
          plugLocalQuaternion,
        })

        // 额外旋转：先绕X轴旋转180度，再绕Z轴旋转90度
        const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
        const rotZ90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
        const extraRotation = rotX180.clone().multiply(rotZ90)

        const newQuaternion = baseQuaternion.clone().multiply(extraRotation)

        // 重新计算位置（因为旋转改变后，插头偏移也要重新计算）
        const plugOffsetRotated = plugLocalPosition.clone().applyQuaternion(newQuaternion)
        const newPosition = socketWorldPosition.clone().sub(plugOffsetRotated)

        state.addPartToActiveDesign({
          partId,
          position: [newPosition.x, newPosition.y, newPosition.z],
          rotation: quaternionToEuler(newQuaternion),
          activeConnectorId: plug.id,
          attachedTo: {
            parentInstanceId: targetParent.instanceId,
            parentConnectorId: targetSocketId,
          },
        })

        console.log(`[Add Part] Successfully snapped ${partData.name} to socket ${targetSocketId}`)
      },
    }),
    {
      name: STORAGE_KEYS.DESIGN_STORE,
    },
  ),
)
