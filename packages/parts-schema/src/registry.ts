/**
 * Part Registry — maps FW-XXX-NNN IDs to GLB files and metadata.
 * Single source of truth for all 77 parts.
 */
import type { PartCategory, BuildStep } from './index'

export interface PartEntry {
  partNumber: string
  category: PartCategory
  name: { zh: string; en: string }
  glbFile: string
  thumbnailFile: string
  weightG: number
  layer?: 'single' | 'double'
  tags: string[]
}

/** Step ↔ allowed categories mapping */
export const STEP_CATEGORIES: Record<BuildStep, PartCategory[]> = {
  HUB: ['HUB'],
  ARM: ['ARM'],
  MOTOR: ['MOTOR', 'PROP'],
  GUARD: ['PLATE', 'JOINT', 'LAND'],
  DECO: ['DECO'],
  REVIEW: [],
}

/** Ordered steps for iteration */
export const BUILD_STEPS: BuildStep[] = ['HUB', 'ARM', 'MOTOR', 'GUARD', 'DECO', 'REVIEW']

/** Step display info */
export const STEP_INFO: Record<BuildStep, { label: string; number: number; description: string }> = {
  HUB: { label: '主板', number: 1, description: '选一块主板作为无人机的核心' },
  ARM: { label: '机臂', number: 2, description: '装上机臂，决定几轴飞行器' },
  MOTOR: { label: '电机', number: 3, description: '给每条机臂装上电机和螺旋桨' },
  GUARD: { label: '保护罩', number: 4, description: '选一种保护罩保护螺旋桨' },
  DECO: { label: '衔接件', number: 5, description: '加衔接件固定双层结构' },
  REVIEW: { label: '检查', number: 6, description: '命名并检查飞行能力' },
}

function hub(num: number, name: string, layer: 'single' | 'double' = 'single'): PartEntry {
  const nn = String(num).padStart(2, '0')
  return {
    partNumber: `FW-HUB-${String(num).padStart(3, '0')}`,
    category: 'HUB',
    name: { zh: `主板·${name}`, en: `Hub · ${name}` },
    glbFile: `core_hub_${nn}.glb`,
    thumbnailFile: `core_hub_${nn}.png`,
    weightG: 8 + num * 0.5,
    layer,
    tags: num <= 3 ? ['初学者'] : [],
  }
}

function arm(num: number): PartEntry {
  const nn = String(num).padStart(2, '0')
  return {
    partNumber: `FW-ARM-${String(num).padStart(3, '0')}`,
    category: 'ARM',
    name: { zh: `机臂 ${nn}`, en: `Arm ${nn}` },
    glbFile: `arm_${nn}.glb`,
    thumbnailFile: `arm_${nn}.png`,
    weightG: 3 + (num % 5) * 0.4,
    tags: num <= 5 ? ['初学者'] : [],
  }
}

function plate(num: number, fileNum: number): PartEntry {
  const fn = String(fileNum).padStart(2, '0')
  return {
    partNumber: `FW-PLATE-${String(num).padStart(3, '0')}`,
    category: 'PLATE',
    name: { zh: `一体保护罩 ${fn}`, en: `Guard Plate ${fn}` },
    glbFile: `core_plate_${fn}.glb`,
    thumbnailFile: `core_plate_${fn}.png`,
    weightG: 12 + num * 0.8,
    tags: ['初学者'],
  }
}

function joint(num: number, fileNum: number): PartEntry {
  const fn = String(fileNum).padStart(2, '0')
  return {
    partNumber: `FW-JOINT-${String(num).padStart(3, '0')}`,
    category: 'JOINT',
    name: { zh: `分体保护罩 ${fn}`, en: `Guard Joint ${fn}` },
    glbFile: `joint_${fn}.glb`,
    thumbnailFile: `joint_${fn}.png`,
    weightG: 5 + num * 0.3,
    tags: [],
  }
}

function land(num: number, fileNum: number): PartEntry {
  const fn = String(fileNum).padStart(2, '0')
  return {
    partNumber: `FW-LAND-${String(num).padStart(3, '0')}`,
    category: 'LAND',
    name: { zh: `半体保护罩 ${fn}`, en: `Guard Landing ${fn}` },
    glbFile: `Landing_${fn}.glb`,
    thumbnailFile: `Landing_${fn}.png`,
    weightG: 7 + num * 0.5,
    tags: [],
  }
}

function deco(num: number): PartEntry {
  const nn = String(num).padStart(2, '0')
  return {
    partNumber: `FW-DECO-${String(num).padStart(3, '0')}`,
    category: 'DECO',
    name: { zh: `衔接件 ${nn}`, en: `Deco ${nn}` },
    glbFile: `deco_${nn}.glb`,
    thumbnailFile: `deco_${nn}.png`,
    weightG: 2 + num * 0.3,
    tags: [],
  }
}

export const PART_REGISTRY: PartEntry[] = [
  // HUB (9)
  hub(1, '经典圆盘'),
  hub(2, '十字型'),
  hub(3, '六边形'),
  hub(4, '方形', 'double'),
  hub(5, '星形'),
  hub(6, '菱形', 'double'),
  hub(7, '三角形'),
  hub(8, '八边形', 'double'),
  hub(9, '异形'),

  // ARM (35)
  ...Array.from({ length: 35 }, (_, i) => arm(i + 1)),

  // PLATE (6) — file numbers: 01, 02, 04, 06, 07, 08
  plate(1, 1),
  plate(2, 2),
  plate(3, 4),
  plate(4, 6),
  plate(5, 7),
  plate(6, 8),

  // JOINT (12) — file numbers: 01, 03, 11-14, 16-20, 25
  joint(1, 1),
  joint(2, 3),
  joint(3, 11),
  joint(4, 12),
  joint(5, 13),
  joint(6, 14),
  joint(7, 16),
  joint(8, 17),
  joint(9, 18),
  joint(10, 19),
  joint(11, 20),
  joint(12, 25),

  // LAND (6) — file numbers: 03, 04, 06, 08, 09, 10
  land(1, 3),
  land(2, 4),
  land(3, 6),
  land(4, 8),
  land(5, 9),
  land(6, 10),

  // DECO (9)
  ...Array.from({ length: 9 }, (_, i) => deco(i + 1)),
]

/** Lookup by part number */
export function getPartByNumber(partNumber: string): PartEntry | undefined {
  return PART_REGISTRY.find(p => p.partNumber === partNumber)
}

/** Filter parts by category */
export function getPartsByCategory(category: PartCategory): PartEntry[] {
  return PART_REGISTRY.filter(p => p.category === category)
}

/** Get parts allowed in a given build step */
export function getPartsForStep(step: BuildStep): PartEntry[] {
  const categories = STEP_CATEGORIES[step]
  return PART_REGISTRY.filter(p => categories.includes(p.category))
}
