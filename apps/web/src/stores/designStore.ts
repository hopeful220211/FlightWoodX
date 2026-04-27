// src/stores/designStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Design, PartInstance } from '../types/design'
import type { BuildStep } from '@fwx/parts-schema'
import { canAdvanceStep, getNextStep, getPrevStep, STEP_CATEGORIES } from '@fwx/parts-schema'
import { STORAGE_KEYS } from '../constants/storageKeys'
import { partsData } from '../data/parts'
import { getCachedPartConnectors } from '../hooks/usePartConnectors'
import * as THREE from 'three'
import { computeSnapTransform, quaternionToEuler } from '../components/design/snap'

import { isConnectionAllowed } from '../utils/connectionRules'

interface DesignState {
  designs: Design[]
  activeDesignId: string | null
  getDesignById: (id: string) => Design | undefined
  createDesign: (name: string, mode?: 'guided' | 'free') => string
  deleteDesign: (id: string) => void
  setActiveDesignId: (id: string | null) => void
  getActiveDesign: () => Design | undefined
  clearAll: () => void
  // --- Part CRUD ---
  addPartToActiveDesign: (part: Omit<PartInstance, 'instanceId'>) => void
  removePartFromActiveDesign: (instanceId: string) => void
  updatePartInActiveDesign: (instanceId: string, updates: Partial<PartInstance>) => void
  // --- Guided build flow ---
  advanceStep: () => boolean
  goBackStep: () => boolean
  canAdvance: () => boolean
  getStepAdvanceReason: () => string | undefined
  resetCurrentStep: () => void
  // --- Interaction state ---
  selectedInstanceId: string | null
  ghostPart: { partId: string; position: [number, number, number] } | null
  highlightedSocket: { instanceId: string; socketId: string; plugId: string } | null
  draggingPartId: string | null
  setSelectedInstanceId: (id: string | null) => void
  setGhostPart: (ghost: { partId: string; position: [number, number, number] } | null) => void
  setHighlightedSocket: (socket: { instanceId: string; socketId: string; plugId: string } | null) => void
  setDraggingPartId: (partId: string | null) => void
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
      createDesign: (name, mode = 'guided') => {
        const newId = `design-${Date.now()}`
        const newDesign: Design = {
          id: newId,
          name,
          updatedAt: new Date().toISOString(),
          buildMode: mode,
          currentStep: 'HUB',
          stepReached: 0,
          parts: [],
        }
        set((state) => ({ designs: [...state.designs, newDesign] }))
        return newId
      },
      deleteDesign: (id) => {
        set((state) => ({ designs: state.designs.filter((d) => d.id !== id) }))
      },
      setActiveDesignId: (id) => set({ activeDesignId: id }),
      clearAll: () => set({ designs: [], activeDesignId: null, selectedInstanceId: null, ghostPart: null, highlightedSocket: null, draggingPartId: null }),
      getActiveDesign: () => {
        const activeId = get().activeDesignId
        if (!activeId) return undefined
        const design = get().designs.find((d) => d.id === activeId)
        if (!design) return undefined
        // Backwards compat: old designs without buildMode default to free
        if (!design.buildMode) {
          return { ...design, buildMode: 'free' as const, currentStep: 'HUB' as const, stepReached: 6 }
        }
        return design
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
      // --- Guided build flow ---
      advanceStep: () => {
        const design = get().getActiveDesign()
        if (!design || design.buildMode !== 'guided') return false

        const hubPart = design.parts.find(p => p.category === 'mainboard')
        const hubEntry = hubPart ? partsData.find(pd => pd.id === hubPart.partId) : undefined
        const hubLayer = hubEntry?.layer ?? 'single'

        const next = getNextStep(design.currentStep, hubLayer)
        if (!next) return false

        const buildState = {
          currentStep: design.currentStep,
          parts: design.parts.map(p => ({ partNumber: p.partId, category: p.category })),
          hubLayer,
        }
        const { canAdvance } = canAdvanceStep(buildState)
        if (!canAdvance) return false

        set(state => ({
          designs: state.designs.map(d =>
            d.id === design.id
              ? { ...d, currentStep: next, stepReached: Math.max(d.stepReached, design.stepReached + 1), updatedAt: new Date().toISOString() }
              : d
          ),
        }))
        return true
      },

      goBackStep: () => {
        const design = get().getActiveDesign()
        if (!design || design.buildMode !== 'guided') return false

        const prev = getPrevStep(design.currentStep)
        if (!prev) return false

        set(state => ({
          designs: state.designs.map(d =>
            d.id === design.id
              ? { ...d, currentStep: prev, updatedAt: new Date().toISOString() }
              : d
          ),
        }))
        return true
      },

      canAdvance: () => {
        const design = get().getActiveDesign()
        if (!design) return false
        if (design.buildMode === 'free') return true

        const hubPart = design.parts.find(p => p.category === 'mainboard')
        const hubEntry = hubPart ? partsData.find(pd => pd.id === hubPart.partId) : undefined
        const hubLayer = hubEntry?.layer ?? 'single'

        const buildState = {
          currentStep: design.currentStep,
          parts: design.parts.map(p => ({ partNumber: p.partId, category: p.category })),
          hubLayer,
        }
        return canAdvanceStep(buildState).canAdvance
      },

      getStepAdvanceReason: () => {
        const design = get().getActiveDesign()
        if (!design) return undefined

        const hubPart = design.parts.find(p => p.category === 'mainboard')
        const hubEntry = hubPart ? partsData.find(pd => pd.id === hubPart.partId) : undefined
        const hubLayer = hubEntry?.layer ?? 'single'

        const buildState = {
          currentStep: design.currentStep,
          parts: design.parts.map(p => ({ partNumber: p.partId, category: p.category })),
          hubLayer,
        }
        return canAdvanceStep(buildState).reason
      },

      resetCurrentStep: () => {
        const design = get().getActiveDesign()
        if (!design || design.buildMode !== 'guided') return

        const allowedCategories = STEP_CATEGORIES[design.currentStep] || []

        set(state => ({
          designs: state.designs.map(d =>
            d.id === design.id
              ? {
                  ...d,
                  parts: d.parts.filter(p => !allowedCategories.includes(p.category)),
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
        }))
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

        // 规则 1：第一个机身可以独立放置，第二个机身必须连接到现有零件
        if (partData.category === 'mainboard') {
          // 检查是否已存在机身
          const existingHub = activeDesign.parts.find((inst) => {
            const p = partsData.find((pd) => pd.id === inst.partId)
            return p?.category === 'mainboard'
          })

          if (existingHub) {
            // 第二个机身必须连接到现有零件上，不能独立放置
            // eslint-disable-next-line no-alert
            alert('第二个机身必须连接到现有零件的连接点上，请拖拽到高亮的连接点。')
            return
          }

          // 第一个机身：独立放置在场景中心
          state.addPartToActiveDesign({
            partId,
            category: partData.category,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
          })
          return
        }

        // 规则 2：非 hub 必须先有机身
        const hasHub = activeDesign.parts.some((inst) => {
          const p = partsData.find((pd) => pd.id === inst.partId)
          return p?.category === 'mainboard'
        })
        if (!hasHub) {
          // eslint-disable-next-line no-alert
          alert('请先添加机身。')
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

        // 寻找第一个空闲且合法的连接点（遍历所有零件）
        console.log('--- [Find Socket] Starting ---')
        console.log(`[Find Socket] Current parts in scene: ${activeDesign.parts.length}`)

        // 首先确定新零件的连接器（优先 plug，如果没有则用 socket）
        const childConns = getCachedPartConnectors(partData.modelUrl)
        const childPlugConnector = childConns.find((c) => c.type === 'plug')
        const childSocketConnector = childConns.find((c) => c.type === 'socket')
        const childConnector = childPlugConnector || childSocketConnector

        if (!childConnector) {
          console.error('[Find Socket] EXIT: No connector found in child part.')
          // eslint-disable-next-line no-alert
          alert('该零件没有可用的连接器。')
          return
        }

        // 计算已占用的插座
        const occupiedSockets = new Set<string>()
        for (const inst of activeDesign.parts) {
          const at = inst.attachedTo
          if (at?.parentInstanceId && at.parentConnectorId) {
            occupiedSockets.add(`${at.parentInstanceId}::${at.parentConnectorId}`)
          }
        }

        // 遍历所有已放置的零件，寻找可用连接点
        let targetParent: PartInstance | null = null
        let targetSocketId: string | null = null

        for (const inst of activeDesign.parts) {
          const instPartData = partsData.find((p) => p.id === inst.partId)
          if (!instPartData) continue

          // 检查连接规则
          if (!isConnectionAllowed(partData.category, instPartData.category)) {
            console.log(`[Find Socket] Skipping ${instPartData.category} - connection not allowed with ${partData.category}`)
            continue
          }

          const connectors = getCachedPartConnectors(instPartData.modelUrl)

          // 根据子零件连接器类型过滤目标连接点
          // - 如果子零件是 plug：可以连接到 socket 或 plug
          // - 如果子零件是 socket：只能连接到 plug（禁止 socket-to-socket）
          const availableConnectors = connectors.filter((c) => {
            if (childConnector.type === 'plug') {
              return c.type === 'socket' || c.type === 'plug'
            } else {
              return c.type === 'plug'
            }
          })

          for (const connector of availableConnectors) {
            const key = `${inst.instanceId}::${connector.id}`
            if (!occupiedSockets.has(key)) {
              targetParent = inst
              targetSocketId = connector.id
              console.log(`[Find Socket] SUCCESS: Found available ${connector.type} on ${instPartData.category} part (child connector: ${childConnector.type})`)
              break
            }
          }

          if (targetParent && targetSocketId) break
        }

        if (!targetParent || !targetSocketId) {
          console.error('[Find Socket] FAILURE: No available connectors found.')
          // eslint-disable-next-line no-alert
          alert('没有可用的连接点。')
          return
        }

        // ✅ 对齐计算：使用 computeSnapTransform 函数
        const parentPart = partsData.find((p) => p.id === targetParent.partId)
        if (!parentPart) {
          console.error('[Add Part] Parent part not found.')
          return
        }
        const parentConns = getCachedPartConnectors(parentPart.modelUrl)
        const parentConnector = parentConns.find((c) => c.id === targetSocketId)
        if (!parentConnector) {
          console.error('[Add Part] Parent connector not found.')
          return
        }

        // 计算父连接器的世界坐标变换
        const parentPos = new THREE.Vector3(...targetParent.position)
        const parentQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...targetParent.rotation))
        const parentConnectorWorldPosition = parentConnector.position.clone().applyQuaternion(parentQuat).add(parentPos)
        const parentConnectorWorldQuaternion = parentQuat.clone().multiply(parentConnector.quaternion.clone())

        // 子连接器的本地变换（已经是相对于子零件的）
        const childConnectorLocalPosition = childConnector.position.clone()
        const childConnectorLocalQuaternion = childConnector.quaternion.clone()

        // 使用 computeSnapTransform 函数计算基础对齐
        const { quaternion: baseQuaternion } = computeSnapTransform({
          socketWorldPosition: parentConnectorWorldPosition,
          socketWorldQuaternion: parentConnectorWorldQuaternion,
          plugLocalPosition: childConnectorLocalPosition,
          plugLocalQuaternion: childConnectorLocalQuaternion,
        })

        // 额外旋转：先绕X轴旋转180度，再绕Z轴旋转90度
        const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
        const rotZ90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2)
        const extraRotation = rotX180.clone().multiply(rotZ90)

        const newQuaternion = baseQuaternion.clone().multiply(extraRotation)

        // 重新计算位置（因为旋转改变后，连接器偏移也要重新计算）
        const childConnectorOffsetRotated = childConnectorLocalPosition.clone().applyQuaternion(newQuaternion)
        const newPosition = parentConnectorWorldPosition.clone().sub(childConnectorOffsetRotated)

        state.addPartToActiveDesign({
          partId,
          category: partData.category,
          position: [newPosition.x, newPosition.y, newPosition.z],
          rotation: quaternionToEuler(newQuaternion),
          activeConnectorId: childConnector.id,
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

/** Standalone function to clear design store — used by authStore on logout to avoid circular deps */
export function clearDesignStore() {
  useDesignStore.getState().clearAll()
}
