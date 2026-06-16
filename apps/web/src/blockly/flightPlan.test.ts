import { describe, it, expect } from 'vitest'
import { describeProgram, type PlanLine } from './flightPlan'
import { COMMAND_PROTOCOL_VERSION, type Command, type CommandProgram } from '@fwx/shared'

function program(commands: Command[]): CommandProgram {
  return {
    version: COMMAND_PROTOCOL_VERSION,
    metadata: { name: 't', author: 't', createdAt: '2026-06-16T00:00:00.000Z' },
    commands,
  }
}

const texts = (lines: PlanLine[]) => lines.map(l => l.text)

describe('describeProgram', () => {
  it('翻译全部 11 种顶层指令', () => {
    const lines = describeProgram(program([
      { type: 'takeoff', params: { altitudeCm: 100 } },
      { type: 'move', params: { direction: 'forward', distanceCm: 150, speedCmS: 40 } },
      { type: 'rotate', params: { degrees: 90 } },
      { type: 'rotate', params: { degrees: -90 } },
      { type: 'hover', params: { durationMs: 500 } },
      { type: 'led', params: { r: 0, g: 255, b: 0 } },
      { type: 'waitUntil', params: { condition: { sensor: 'frontDistanceCm', op: '<', value: 30 } } },
      { type: 'lockAxis', params: { axes: ['forward', 'vertical'] } },
      { type: 'land' },
    ]))

    expect(texts(lines)).toEqual([
      '起飞到 100 厘米',
      '向前飞 150 厘米',
      '向右转 90°',
      '向左转 90°',
      '悬停 0.5 秒',
      '灯光变颜色',
      '等到「前方距离 小于 30 厘米」',
      '锁定 前后、升降 方向',
      '降落',
    ])
  })

  it('led 行带 colorHex 色块', () => {
    const [line] = describeProgram(program([{ type: 'led', params: { r: 43, g: 136, b: 219 } }]))
    expect(line.kind).toBe('led')
    expect(line.colorHex).toBe('#2b88db')
  })

  it('电量条件用百分号、不带空格', () => {
    const [line] = describeProgram(program([
      { type: 'waitUntil', params: { condition: { sensor: 'battery', op: '>', value: 20 } } },
    ]))
    expect(line.text).toBe('等到「电量 大于 20%」')
  })

  it('repeat 把循环体缩进一层', () => {
    const lines = describeProgram(program([
      { type: 'repeat', params: { times: 4, body: [{ type: 'land' }] } },
    ]))
    expect(lines).toEqual([
      { depth: 0, kind: 'repeat', text: '重复 4 次：' },
      { depth: 1, kind: 'land', text: '降落' },
    ])
  })

  it('ifElse 渲染 if / else 头与缩进子句；无 else 时不出否则', () => {
    const withElse = describeProgram(program([
      {
        type: 'ifElse',
        params: {
          condition: { sensor: 'frontDistanceCm', op: '<', value: 30 },
          then: [{ type: 'rotate', params: { degrees: 90 } }],
          else: [{ type: 'land' }],
        },
      },
    ]))
    expect(withElse).toEqual([
      { depth: 0, kind: 'if', text: '如果「前方距离 小于 30 厘米」，就：' },
      { depth: 1, kind: 'rotate', text: '向右转 90°' },
      { depth: 0, kind: 'else', text: '否则：' },
      { depth: 1, kind: 'land', text: '降落' },
    ])

    const noElse = describeProgram(program([
      {
        type: 'ifElse',
        params: {
          condition: { sensor: 'frontDistanceCm', op: '<', value: 30 },
          then: [{ type: 'land' }],
        },
      },
    ]))
    expect(noElse.map(l => l.kind)).toEqual(['if', 'land'])
  })

  it('while 内嵌 ifElse —— 多层缩进正确', () => {
    const lines = describeProgram(program([
      {
        type: 'while',
        params: {
          condition: { sensor: 'battery', op: '>', value: 10 },
          body: [
            {
              type: 'ifElse',
              params: {
                condition: { sensor: 'frontDistanceCm', op: '<', value: 30 },
                then: [{ type: 'rotate', params: { degrees: 90 } }],
              },
            },
          ],
        },
      },
    ]))
    expect(lines.map(l => [l.depth, l.kind])).toEqual([
      [0, 'while'],
      [1, 'if'],
      [2, 'rotate'],
    ])
  })

  it('空程序 → 空计划', () => {
    expect(describeProgram(program([]))).toEqual([])
  })
})
