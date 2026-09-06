// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { compileWorkspaceXml } from './compileWorkspaceXml'
import { EXAMPLE_PROGRAM_XML } from './exampleProgram'

describe('saved Blockly XML execution', () => {
  it('recompiles the saved blocks for the simulator', () => {
    const program = compileWorkspaceXml(EXAMPLE_PROGRAM_XML, { name: '当前作品', author: '设计师' })
    expect(program.commands.map(command => command.type)).toEqual(['takeoff', 'move', 'led', 'land'])
    expect(program.metadata.name).toBe('当前作品')
  })

  it('does not run a missing-condition draft or malformed XML', () => {
    expect(() => compileWorkspaceXml('<xml><block type="drone_wait_until" /></xml>', { name: 'Test', author: 'Test' })).toThrow('条件')
    expect(() => compileWorkspaceXml('<xml><block', { name: 'Test', author: 'Test' })).toThrow('无法读取')
  })
})
