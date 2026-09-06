import { afterEach, describe, expect, it, vi } from 'vitest'
import { COMMAND_LIMITS } from '@fwx/shared'
import type { Command, CommandProgram } from '@fwx/shared'
import { SimAdapter } from './SimAdapter'

function programWithWhile(maxIterations: number): CommandProgram {
  return {
    version: '1.0',
    metadata: {
      name: 'while limit test',
      author: 'test',
      createdAt: '2026-08-04T00:00:00.000Z',
    },
    commands: [
      {
        type: 'while',
        params: {
          condition: { sensor: 'battery', op: '>', value: 0 },
          maxIterations,
          body: [{ type: 'led', params: { r: 1, g: 2, b: 3 } }],
        },
      },
    ],
  }
}

describe('SimAdapter while loop limits', () => {
  it('honors a command-specific maximum', async () => {
    const started: Command[] = []
    const adapter = new SimAdapter()

    await adapter.execute(programWithWhile(2), {
      onCommandStart: (_index, command) => started.push(command),
    })

    expect(started.filter((command) => command.type === 'led')).toHaveLength(2)
  })

  it('rejects unvalidated input beyond the protocol maximum before execution', async () => {
    const started: Command[] = []
    const adapter = new SimAdapter()

    await adapter.execute(programWithWhile(COMMAND_LIMITS.maxWhileIterations + 1), {
      onCommandStart: (_index, command) => started.push(command),
    })

    expect(started).toHaveLength(0)
  })
})

const makeProgram = (commands: Command[]): CommandProgram => ({ ...programWithWhile(2), commands })
afterEach(() => vi.useRealTimers())

describe('SimAdapter stop, reset and failure behavior', () => {
  it('stops a rotation at its current heading instead of snapping to the target', async () => {
    vi.useFakeTimers()
    const adapter = new SimAdapter()
    const finished = vi.fn()
    const running = adapter.execute(makeProgram([{ type: 'rotate', params: { degrees: 180 } }]), { onFinish: finished })
    adapter.stop()
    await vi.runAllTimersAsync()
    await running
    expect(adapter.getState().heading).toBeLessThan(180)
    expect(finished).toHaveBeenCalledTimes(1)
    expect(finished.mock.calls[0][0]).toMatchObject({ success: false })
    expect(finished.mock.calls[0][0].events).not.toContain('rotate 180deg')
  })

  it('clears the previous LED when the same adapter is run again', async () => {
    const adapter = new SimAdapter()
    await adapter.execute(makeProgram([{ type: 'led', params: { r: 255, g: 0, b: 0 } }]), {})
    await adapter.execute(makeProgram([]), {})
    expect(adapter.getState().ledColor).toEqual([0, 0, 0])
  })

  it('does not silently continue after an unmet wait condition times out', async () => {
    vi.useFakeTimers()
    const adapter = new SimAdapter()
    const finished = vi.fn()
    const execution = adapter.execute(makeProgram([
      { type: 'waitUntil', params: { condition: { sensor: 'battery', op: '<', value: 0 } } },
      { type: 'led', params: { r: 255, g: 0, b: 0 } },
    ]), { onFinish: finished })
    await vi.runAllTimersAsync()
    await execution
    expect(finished.mock.calls[0][0].success).toBe(false)
    expect(adapter.getState().ledColor).toEqual([0, 0, 0])
  })

  it('treats takeoff altitude as an absolute height on repeated takeoff', async () => {
    vi.useFakeTimers()
    const adapter = new SimAdapter()
    const running = adapter.execute(makeProgram([
      { type: 'takeoff', params: { altitudeCm: 50 } },
      { type: 'takeoff', params: { altitudeCm: 100 } },
    ]), {})
    await vi.runAllTimersAsync()
    await running
    expect(adapter.getState().pos[1]).toBeCloseTo(100)
  })
})
