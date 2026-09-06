import { describe, expect, it } from 'vitest'
import type { PartInstance } from '../types/design'
import { calculateStats, getWeightLabel } from './designStats'

const known: PartInstance = { instanceId: 'known', partId: 'core_hub_01', category: 'mainboard', position: [0, 0, 0], rotation: [0, 0, 0] }

describe('design statistics evidence', () => {
  it('tracks missing mass separately without filling it with an invented 2g', () => {
    const stats = calculateStats([known, { ...known, instanceId: 'unknown', partId: 'missing' }])
    expect(stats.totalWeightG).toBe(3)
    expect(stats.weightMissingCount).toBe(1)
    expect(stats.weightKnownCount).toBe(1)
    expect(stats.thrustWeightRatio).toBeNull()
    expect(stats.estimatedFlightMinutes).toBeNull()
  })

  it('never grades unverified mass with a 25g or 35g flight threshold', () => {
    for (const mass of [3, 30, 50]) {
      expect(getWeightLabel(mass).ok).toBe(false)
      expect(getWeightLabel(mass).text).toContain('估算')
      expect(getWeightLabel(mass).text).not.toMatch(/够轻|适中|影响起飞/)
    }
  })

  it('does not equate centered mean coordinates with mirrored parts', () => {
    const positions: PartInstance['position'][] = [[1, 0, 0], [-0.5, 0, 0.4], [-0.5, 0, -0.4]]
    const stats = calculateStats(positions.map((position, index) => ({ ...known, position, instanceId: `part-${index}` })))
    expect(stats.symmetryPercent).toBe(0)
  })
})
