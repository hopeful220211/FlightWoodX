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

  it('reports malformed XML and leaves no partial blocks behind', () => {
    workspace.newBlock('math_number')

    expect(restoreWorkspaceXml(workspace, '<xml><block')).toBe(false)
    expect(workspace.getTopBlocks(false)).toHaveLength(0)
  })
})
