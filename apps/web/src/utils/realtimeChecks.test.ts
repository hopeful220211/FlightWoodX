import { describe, expect, it } from 'vitest'
import type { PartInstance } from '../types/design'
import { checkDualMainboard } from './realtimeChecks'

const board = (id: string, height: number, rotation: [number, number, number]): PartInstance => ({
  instanceId: id, partId: 'core_hub_01', category: 'mainboard', position: [0, height, 0], rotation,
})

describe('dual mainboard geometry', () => {
  it('accepts equivalent Euler rotations that leave both boards horizontal', () => {
    expect(checkDualMainboard([board('bottom', 0, [0, 0, 0]), board('top', 0.04, [Math.PI, 0, Math.PI])])).toBeNull()
  })

  it('continues to warn about a genuinely tilted or coplanar board', () => {
    expect(checkDualMainboard([board('bottom', 0, [0, 0, 0]), board('top', 0.04, [Math.PI / 4, 0, 0])])?.id).toBe('mainboard-level')
    expect(checkDualMainboard([board('bottom', 0, [0, 0, 0]), board('top', 0.001, [0, 0, 0])])?.id).toBe('mainboard-parallel')
  })
})
