// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import * as Blockly from 'blockly'
import './blocks' // 注册自定义积木（含 drone_start）
import { compileWorkspace } from './compiler'

const META = { name: 't', author: 't' }

let ws: Blockly.Workspace
beforeEach(() => {
  ws = new Blockly.Workspace()
})

/** 连接 a.next → b.previous，返回 b 以便链式 */
function chain(a: Blockly.Block, b: Blockly.Block): Blockly.Block {
  a.nextConnection!.connect(b.previousConnection!)
  return b
}

describe('compileWorkspace —— 开始锚点语义', () => {
  it('rejects an unfinished condition instead of silently skipping the command', () => {
    ws.newBlock('drone_wait_until')
    expect(() => compileWorkspace(ws, META)).toThrow('条件')
  })

  it('does not run disabled blocks', () => {
    const takeoff = ws.newBlock('drone_takeoff')
    const land = ws.newBlock('drone_land')
    chain(takeoff, land)
    takeoff.setDisabledReason(true, 'user')
    expect(compileWorkspace(ws, META).commands.map(command => command.type)).toEqual(['land'])
  })
  it('无 start：回退编译顶层链', () => {
    const tk = ws.newBlock('drone_takeoff')
    const land = ws.newBlock('drone_land')
    chain(tk, land)

    const prog = compileWorkspace(ws, META)
    expect(prog.commands.map((c) => c.type)).toEqual(['takeoff', 'land'])
  })

  it('1 个 start：只编译它后面那串，start 自身不产指令，散块被忽略', () => {
    const start = ws.newBlock('drone_start')
    const tk = ws.newBlock('drone_takeoff')
    const land = ws.newBlock('drone_land')
    chain(start, tk)
    chain(tk, land)

    // 一块没连进来的散积木，不应被执行
    ws.newBlock('drone_rotate')

    const prog = compileWorkspace(ws, META)
    expect(prog.commands.map((c) => c.type)).toEqual(['takeoff', 'land'])
  })

  it('多个 start：报错，不静默选一个', () => {
    ws.newBlock('drone_start')
    ws.newBlock('drone_start')
    expect(() => compileWorkspace(ws, META)).toThrow('只能有一个')
  })

  it('只有一个空 start：编译出空程序（合法）', () => {
    ws.newBlock('drone_start')
    const prog = compileWorkspace(ws, META)
    expect(prog.commands).toEqual([])
  })
})
