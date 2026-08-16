/**
 * 重新组织 parts.ts 文件
 * 1. hub (机身 - 原中心枢纽) 放在最前
 * 2. body (保护板 - 原核心板) 放在第二
 * 3. 更新分类名称
 */

const fs = require('fs');
const path = require('path');

// 定义所有零件（按新顺序）
const partsConfig = {
  hub: {
    label: '机身',
    comment: 'Hub - 原中心枢纽',
    parts: [
      { id: 'core_hub_01', name: '机身01', weight: 30, essential: true },
      { id: 'core_hub_02', name: '机身02', weight: 32, essential: true },
      { id: 'core_hub_03', name: '机身03', weight: 31, essential: true },
      { id: 'core_hub_04', name: '机身04', weight: 33 },
      { id: 'core_hub_05', name: '机身05', weight: 29 },
      { id: 'core_hub_06', name: '机身06', weight: 34 },
      { id: 'core_hub_07', name: '机身07', weight: 28 },
      { id: 'core_hub_08', name: '机身08', weight: 35 },
      { id: 'core_hub_09', name: '机身09', weight: 30 },
    ]
  },
  body: {
    label: '保护板',
    comment: 'Body - 原核心板',
    parts: [
      { id: 'core_plate_01', name: '保护板01', weight: 50 },
      { id: 'core_plate_02', name: '保护板02', weight: 48 },
      { id: 'core_plate_04', name: '保护板04', weight: 52 },
      { id: 'core_plate_06', name: '保护板06', weight: 51 },
      { id: 'core_plate_07', name: '保护板07', weight: 49 },
      { id: 'core_plate_08', name: '保护板08', weight: 53 },
    ]
  },
  arm: {
    label: '机臂',
    comment: 'Arm',
    parts: Array.from({ length: 35 }, (_, i) => ({
      id: `arm_${String(i + 1).padStart(2, '0')}`,
      name: `机臂${String(i + 1).padStart(2, '0')}`,
      weight: [15, 12, 14, 13, 16, 15, 14, 13, 15, 12, 14, 16, 13, 15, 14, 12, 15, 13, 14, 16, 15, 12, 14, 13, 15, 14, 16, 13, 15, 12, 14, 15, 13, 16, 14][i],
      essential: i < 2
    }))
  },
  joint: {
    label: '连接件',
    comment: 'Joint',
    parts: [
      { id: 'joint_01', name: '连接件01', weight: 8 },
      { id: 'joint_03', name: '连接件03', weight: 7 },
      { id: 'joint_11', name: '连接件11', weight: 9 },
      { id: 'joint_12', name: '连接件12', weight: 8 },
      { id: 'joint_13', name: '连接件13', weight: 7 },
      { id: 'joint_14', name: '连接件14', weight: 9 },
      { id: 'joint_16', name: '连接件16', weight: 8 },
      { id: 'joint_17', name: '连接件17', weight: 7 },
      { id: 'joint_18', name: '连接件18', weight: 8 },
      { id: 'joint_19', name: '连接件19', weight: 9 },
      { id: 'joint_20', name: '连接件20', weight: 7 },
      { id: 'joint_25', name: '连接件25', weight: 8 },
    ]
  },
  decoration: {
    label: '装饰件',
    comment: 'Decoration',
    parts: Array.from({ length: 9 }, (_, i) => ({
      id: `deco_${String(i + 1).padStart(2, '0')}`,
      name: `装饰件${String(i + 1).padStart(2, '0')}`,
      weight: [3, 4, 3, 5, 3, 4, 3, 4, 5][i]
    }))
  },
  landing: {
    label: '起落架',
    comment: 'Landing',
    parts: [
      { id: 'Landing_03', name: '起落架03', weight: 20 },
      { id: 'Landing_04', name: '起落架04', weight: 22 },
      { id: 'Landing_06', name: '起落架06', weight: 21 },
      { id: 'Landing_08', name: '起落架08', weight: 23 },
      { id: 'Landing_09', name: '起落架09', weight: 20 },
      { id: 'Landing_10', name: '起落架10', weight: 24 },
    ]
  }
};

// 生成零件代码
function generatePartEntry(category, part) {
  return `  {
    id: '${part.id}',
    name: '${part.name}',
    category: '${category}',
    weight: ${part.weight},
    modelUrl: '/models/${part.id}.glb',
    thumbnailUrl: '/thumbnails/${part.id}.png',${part.essential ? '\n    isEssential: true,' : ''}
  }`;
}

// 生成完整文件
let output = `// src/data/parts.ts
import type { Part } from '../types/design';

// 零件数据源 - 所有零件都使用真实的 3D 模型
export const partsData: Part[] = [
`;

for (const [category, config] of Object.entries(partsConfig)) {
  output += `  // ==================== ${config.label} (${config.comment}) ====================\n`;
  config.parts.forEach((part, index) => {
    output += generatePartEntry(category, part);
    if (index < config.parts.length - 1) {
      output += ',\n';
    }
  });
  output += ',\n\n';
}

output += `];\n`;

// 写入文件
const filePath = path.join(__dirname, '../src/data/parts.ts');
fs.writeFileSync(filePath, output);

console.log('✅ parts.ts reorganized successfully!');
console.log(`   - Hub (机身): ${partsConfig.hub.parts.length} parts`);
console.log(`   - Body (保护板): ${partsConfig.body.parts.length} parts`);
console.log(`   - Arm (机臂): ${partsConfig.arm.parts.length} parts`);
console.log(`   - Joint (连接件): ${partsConfig.joint.parts.length} parts`);
console.log(`   - Decoration (装饰件): ${partsConfig.decoration.parts.length} parts`);
console.log(`   - Landing (起落架): ${partsConfig.landing.parts.length} parts`);
