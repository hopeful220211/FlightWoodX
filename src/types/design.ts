// src/types/design.ts

// 零件库中单个零件的静态元数据
export interface Part {
  id: string;
  name: string;
  category: string;
  weight: number;
  modelUrl: string;
  thumbnailUrl?: string;
  isEssential: boolean;
  /** 连接点数组（可选，将从模型动态提取） */
  connectors?: {
    id: string
    type: 'socket' | 'plug'
    /** 可选：从模型动态解析得到 */
    position?: [number, number, number]
    /** 可选：从模型动态解析得到 */
    rotation?: [number, number, number]
  }[]
}

// 3D场景中一个被放置的零件实例
export interface PartInstance {
  instanceId: string // 唯一实例ID
  partId: string // 对应的零件ID
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: [number, number, number] // 新增：缩放
  activeConnectorId?: string // 新增：当前实例用于连接的PLUG ID
  // 如果此零件已连接，记录其父级信息
  attachedTo?: {
    parentInstanceId: string
    parentConnectorId: string
  } | null
}

// 整个无人机设计的数据结构
export interface Design {
  id: string
  name: string
  thumbnail?: string
  updatedAt: string
  parts: PartInstance[]
}

export interface Connector {
  id: string;
  type: 'socket' | 'plug';
  position: [number, number, number];
  rotation: [number, number, number];
}