import { describe, expect, it } from 'vitest'
import type { PartInstance } from '../../types/design'
import { transformPartTree } from './assemblyTransforms'

const part = (instanceId: string, x: number, parent?: string): PartInstance => ({
  instanceId, partId: 'arm_01', category: 'landing', position: [x, 0, 0], rotation: [0, 0, 0],
  ...(parent ? { attachedTo: { parentInstanceId: parent, parentConnectorId: 'PLUG_2' } } : {}),
})

describe('transformPartTree', () => {
  it('keeps a multi-level attachment together when its parent is flipped', () => {
    const original = [part('root', 1), part('child', 2, 'root'), part('grandchild', 3, 'child'), part('unrelated', 5)]
    const transformed = transformPartTree(original, 'root', { rotation: [0, 0, Math.PI] })
    expect(transformed[1].position[0]).toBeCloseTo(0)
    expect(transformed[2].position[0]).toBeCloseTo(-1)
    expect(transformed[1].rotation[2]).toBeCloseTo(Math.PI)
    expect(transformed[3]).toBe(original[3])
    expect(original[1].position).toEqual([2, 0, 0])
    expect(transformed[2].attachedTo).toEqual(original[2].attachedTo)
  })

  it('moves attached descendants by the same translation', () => {
    const transformed = transformPartTree([part('root', 1), part('child', 2, 'root')], 'root', { position: [4, 0, 0] })
    expect(transformed[1].position).toEqual([5, 0, 0])
  })
})
