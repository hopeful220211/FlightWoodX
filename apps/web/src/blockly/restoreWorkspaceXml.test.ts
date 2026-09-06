// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import { restoreWorkspaceXml } from './restoreWorkspaceXml'

describe('restoreWorkspaceXml', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    workspace = new Blockly.Workspace()
  })

  it('restores valid XML and reports success', () => {
    const xml = '<xml xmlns="https://developers.google.com/blockly/xml"><block type="math_number" id="n"><field name="NUM">7</field></block></xml>'

    expect(restoreWorkspaceXml(workspace, xml)).toBe(true)
    expect(workspace.getTopBlocks(false)).toHaveLength(1)
  })

  it('rejects malformed XML without erasing the current workspace', () => {
    const existing = workspace.newBlock('math_number')

    expect(restoreWorkspaceXml(workspace, '<xml><block')).toBe(false)
    expect(workspace.getTopBlocks(false).map(block => block.id)).toEqual([existing.id])
  })

  it('rejects unknown blocks before replacing a valid workspace', () => {
    const existing = workspace.newBlock('math_number')
    expect(restoreWorkspaceXml(workspace, '<xml><block type="not_a_real_block" /></xml>')).toBe(false)
    expect(workspace.getTopBlocks(false).map(block => block.id)).toEqual([existing.id])
  })
})
