import type { PartInstance } from '../types/design'

export interface MaterialEstimate {
  totalCutLengthMm: number
  suggestedBoardSize: string
  boardCount: number
  cutTimeMinutes: number
  dxfFiles: Array<{ name: string; count: number }>
}

export function estimateMaterial(parts: PartInstance[]): MaterialEstimate {
  // Group parts by partId to count duplicates
  const grouped = new Map<string, number>()
  for (const p of parts) {
    grouped.set(p.partId, (grouped.get(p.partId) ?? 0) + 1)
  }

  const dxfFiles: Array<{ name: string; count: number }> = []
  for (const [partId, count] of grouped) {
    dxfFiles.push({ name: partId, count })
  }

  // Rough cut length: ~80mm per part on average
  const totalParts = parts.length
  const totalCutLengthMm = totalParts * 80

  // Laser cutter speed ~230mm/s
  const cutTimeSeconds = totalCutLengthMm / 230
  const cutTimeMinutes = Math.max(1, Math.ceil(cutTimeSeconds / 60))

  return {
    totalCutLengthMm,
    suggestedBoardSize: '300mm × 200mm',
    boardCount: 1,
    cutTimeMinutes,
    dxfFiles,
  }
}
