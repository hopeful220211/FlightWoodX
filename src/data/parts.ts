// src/data/parts.ts
import type { Part } from '../types/design';

// 零件数据源 - 所有零件都使用真实的 3D 模型
export const partsData: Part[] = [
  // --- 您的真实模型 ---
  {
    id: 'core_plate_01', // 与文件名 core_plate_01.glb 匹配
    name: '机身01',
    category: 'body',
    weight: 50,
    modelUrl: '/models/core_plate_01.glb',
    isEssential: true,
    // connectors 数组已移除，将由代码动态提取
  },
  {
    id: 'core_plate_02', // 与文件名 core_plate_02.glb 匹配
    name: '机身02',
    category: 'body',
    weight: 48,
    modelUrl: '/models/core_plate_02.glb',
    isEssential: true,
    // connectors 数组已移除，将由代码动态提取
  },
  {
    id: 'arm_01', // 修正了id，与文件名 arm_01.glb 匹配
    name: '机臂01',
    category: 'arm',
    weight: 15,
    modelUrl: '/models/arm_01.glb',
    isEssential: true,
    // connectors 数组已移除
  },
  {
    id: 'arm_02', // 与文件名 arm_02.glb 匹配
    name: '机臂02',
    category: 'arm',
    weight: 12,
    modelUrl: '/models/arm_02.glb',
    isEssential: true,
    // connectors 数组已移除
  },
];

// 3. 移除了位于文件末尾的 useGLTF.preload 循环
//    因为这个逻辑已经由 useModelData Hook 更可靠地处理了。