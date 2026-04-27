// src/data/parts.ts
// Derives frontend Part[] from the shared registry
import { PART_REGISTRY } from '@fwx/parts-schema'
import type { PartEntry } from '@fwx/parts-schema'
import type { Part } from '../types/design'

function entryToPart(entry: PartEntry): Part {
  return {
    id: entry.id,
    partNumber: entry.partNumber,
    name: entry.name.zh,
    category: entry.category,
    weight: entry.weightG,
    modelUrl: entry.modelPath,
    thumbnailUrl: `/thumbnails/${entry.thumbnailFile}`,
    isEssential: entry.tags.includes('初学者'),
    tags: entry.tags,
  }
}

export const partsData: Part[] = PART_REGISTRY.map(entryToPart)

/** Get parts filtered by category */
export function getPartsByCategory(category: string): Part[] {
  return partsData.filter(p => p.category === category)
}

/** Lookup part by its FW-XXX-NNN number */
export function getPartByNumber(partNumber: string): Part | undefined {
  return partsData.find(p => p.partNumber === partNumber)
}

/** Lookup part by legacy id (glb filename without extension) */
export function getPartById(id: string): Part | undefined {
  return partsData.find(p => p.id === id)
}
