// src/types/design.ts
import type {
  DesignPartInstance,
  DesignSafetyCheck,
  DroneDesignSnapshot,
  PartCategory,
} from '@fwx/parts-schema'

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
export type PartInstance = DesignPartInstance

// 飞行检查结果
export type SafetyCheck = DesignSafetyCheck

// 整个无人机设计的数据结构
export type Design = DroneDesignSnapshot

export interface Connector {
  id: string;
  type: 'socket' | 'plug';
  position: [number, number, number];
  rotation: [number, number, number];
}
