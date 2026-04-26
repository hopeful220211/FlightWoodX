// src/types/design.ts
import type { PartCategory, BuildStep } from '@fwx/parts-schema'

// 零件库中单个零件的静态元数据
export interface Part {
  id: string;
  partNumber: string;
  name: string;
  category: PartCategory;
  weight: number;
  modelUrl: string;
  thumbnailUrl?: string;
  isEssential: boolean;
  layer?: 'single' | 'double';
  tags: string[];
  /** 连接点数组（可选，将从模型动态提取） */
  connectors?: {
    id: string
    type: 'socket' | 'plug'
    position?: [number, number, number]
    rotation?: [number, number, number]
  }[]
}

// 3D场景中一个被放置的零件实例
export interface PartInstance {
  instanceId: string
  partId: string
  category: PartCategory
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number]
  activeConnectorId?: string
  attachedTo?: {
    parentInstanceId: string
    parentConnectorId: string
  } | null
}

// 飞行检查结果
export interface SafetyCheck {
  totalWeightG: number
  centerOfMassOffset: number
  thrustToWeightRatio: number
  symmetryScore: number
  level: 'green' | 'yellow' | 'red'
}

// 整个无人机设计的数据结构
export interface Design {
  id: string
  name: string
  thumbnail?: string
  updatedAt: string
  buildMode: 'guided' | 'free'
  currentStep: BuildStep
  stepReached: number
  parts: PartInstance[]
  safetyCheck?: SafetyCheck
  exportedAt?: string
}

export interface Connector {
  id: string;
  type: 'socket' | 'plug';
  position: [number, number, number];
  rotation: [number, number, number];
}
