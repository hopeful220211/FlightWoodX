// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { CommandProgram } from '@fwx/shared'
import { migrateProgramStoreState, useProgramStore } from './programStore'

function makeProgram(name: string, red: number): CommandProgram {
  return {
    version: '1.0',
    metadata: {
      name,
      author: 'test',
      createdAt: '2026-08-04T00:00:00.000Z',
    },
    commands: [{ type: 'led', params: { r: red, g: 0, b: 0 } }],
  }
}

describe('programStore design isolation', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgramStore.getState().clearAllPrograms()
  })

  it('keeps two designs independent across alternating edits', () => {
    const programA1 = makeProgram('A1', 1)
    const programA2 = makeProgram('A2', 2)
    const programB = makeProgram('B', 3)

    useProgramStore.getState().setProgram('design-a', '<xml>A1</xml>', programA1)
    useProgramStore.getState().setProgram('design-b', '<xml>B</xml>', programB)
    useProgramStore.getState().setProgram('design-a', '<xml>A2</xml>', programA2)

    expect(useProgramStore.getState().getDraft('design-a')).toMatchObject({
      blocklyXml: '<xml>A2</xml>',
      commandProgram: programA2,
    })
    expect(useProgramStore.getState().getDraft('design-b')).toMatchObject({
      blocklyXml: '<xml>B</xml>',
      commandProgram: programB,
    })
  })

  it('scopes server ids and clearing to the selected design', () => {
    useProgramStore.getState().setProgram('design-a', '<xml>A</xml>', makeProgram('A', 1))
    useProgramStore.getState().setProgram('design-b', '<xml>B</xml>', makeProgram('B', 2))
    useProgramStore.getState().setServerId('design-a', 'program-a')
    useProgramStore.getState().setServerId('design-b', 'program-b')

    useProgramStore.getState().clearProgram('design-a')

    expect(useProgramStore.getState().getDraft('design-a')).toBeNull()
    expect(useProgramStore.getState().getDraft('design-b')).toMatchObject({
      blocklyXml: '<xml>B</xml>',
      serverId: 'program-b',
    })
  })

  it('preserves the old single-program state until one design claims it', () => {
    const legacyProgram = makeProgram('legacy', 8)
    const migrated = migrateProgramStoreState(
      {
        blocklyXml: '<xml>legacy</xml>',
        commandProgram: legacyProgram,
        updatedAt: '2026-08-04T00:00:00.000Z',
        serverId: 'legacy-program',
      },
      0,
    )
    useProgramStore.setState(migrated)

    expect(useProgramStore.getState().claimLegacyDraft('design-a')).toMatchObject({
      blocklyXml: '<xml>legacy</xml>',
      serverId: 'legacy-program',
    })
    expect(useProgramStore.getState().getDraft('design-b')).toBeNull()
    expect(useProgramStore.getState().legacyDraft).toBeNull()
  })
})
