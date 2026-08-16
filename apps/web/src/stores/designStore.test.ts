// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { partsData } from '../data/parts'
import { useDesignStore } from './designStore'

describe('designStore addPartSmart result', () => {
  beforeEach(() => {
    localStorage.clear()
    useDesignStore.setState({
      designs: [],
      activeDesignId: null,
      deletedIds: [],
      selectedInstanceId: null,
      ghostPart: null,
      highlightedSocket: null,
      draggingPartId: null,
    })
  })

  it('returns true only when the part was written to the active design', async () => {
    const store = useDesignStore.getState()
    const hub = partsData.find((part) => part.category === 'mainboard')
    expect(hub).toBeDefined()

    expect(await store.addPartSmart('missing-part')).toBe(false)

    const designId = store.createDesign('test', 'guided')
    store.setActiveDesignId(designId)

    expect(await store.addPartSmart(hub!.id)).toBe(true)
    expect(useDesignStore.getState().getDesignById(designId)?.parts).toHaveLength(1)

    expect(await store.addPartSmart(hub!.id)).toBe(false)
    expect(useDesignStore.getState().getDesignById(designId)?.parts).toHaveLength(1)
  })
})
