import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PART_REGISTRY } from '@fwx/parts-schema'

describe('part registry assets', () => {
  it('keeps every registered model and thumbnail available in public assets', () => {
    expect(PART_REGISTRY).toHaveLength(94)

    for (const part of PART_REGISTRY) {
      expect(existsSync(resolve('public', part.modelPath.replace(/^\//, ''))), part.modelPath).toBe(true)
      expect(existsSync(resolve('public/thumbnails', part.thumbnailFile)), part.thumbnailFile).toBe(true)
    }
  })
})
