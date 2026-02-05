// src/data/parts.ts

// 1. 使用您项目中正确的导入路径
import type { Part } from '../types/design';

// 一个辅助函数，用于生成缩略图的SVG数据URL
const thumb = (label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f0e6d8"/><stop offset="1" stop-color="#cba87a"/></linearGradient></defs><rect width="100%" height="100%" rx="18" fill="url(#g )"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Noto Sans SC" font-size="22" fill="#6e4626">${label}</text></svg>`,
  )}`;

// 2. 合并 partsData 和 parts，并清理所有硬编码的 connectors
//    这是项目中唯一的、权威的零件数据源。
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

  // --- 来自旧 parts 数组的占位符模型 ---
  // body
  {
    id: 'p_body_01',
    name: '机身主梁（基础）',
    category: 'body',
    thumbnailUrl: thumb('机身主梁'),
    modelUrl: '/models/placeholder.glb',
    weight: 18,
    isEssential: true,
  },
  {
    id: 'p_body_02',
    name: '机身短梁（加固）',
    category: 'body',
    thumbnailUrl: thumb('机身短梁'),
    modelUrl: '/models/placeholder.glb',
    weight: 10,
    isEssential: false,
  },
  // ... 您可以继续添加其他来自旧 parts 数组的零件 ...
  // ... 我在这里省略了，以保持代码简洁，但您应该把它们都加进来 ...
  // ... 确保所有零件都没有硬编码的 connectors 数组 ...
];

// 3. 移除了位于文件末尾的 useGLTF.preload 循环
//    因为这个逻辑已经由 useModelData Hook 更可靠地处理了。