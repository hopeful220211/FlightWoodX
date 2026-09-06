import { expect, it } from 'vitest'
import type { Design } from '../../../types/design'
import { coverKeyOf } from './coverKey'

it('invalidates a cover for same-count transforms and custom-source revisions', () => {
  const design: Design = {
    schemaVersion: 1, id: 'cover', name: 'Cover', buildMode: 'free', currentStep: 'REVIEW',
    stepReached: 0, updatedAt: '2026-09-07T00:00:00.000Z',
    parts: [{ instanceId: 'custom', partId: 'custom_507f1f77bcf86cd799439011', category: 'landing', position: [0, 0, 0], rotation: [0, 0, 0],
      source: { kind: 'custom', id: '507f1f77bcf86cd799439011', version: 1, updatedAt: '2026-09-07T00:00:00.000Z' } }],
  }
  const key = coverKeyOf(design)
  expect(coverKeyOf({ ...design, parts: [{ ...design.parts[0], position: [0.02, 0, 0] }] })).not.toBe(key)
  expect(coverKeyOf({ ...design, parts: [{ ...design.parts[0], source: { ...design.parts[0].source!, version: 2 } }] })).not.toBe(key)
  expect(coverKeyOf({ ...design, id: 'another' })).not.toBe(key)
})
