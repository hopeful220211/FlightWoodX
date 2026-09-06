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
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

function delayTimerCallbacks(minimumDelayMs: number) {
  vi.useFakeTimers()
  const schedule = globalThis.setTimeout
  vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, ms, ...args) =>
    schedule(callback, Math.max(ms ?? 0, minimumDelayMs), ...args))
}

describe('SimAdapter elapsed time under delayed browser callbacks', () => {
  it('finishes a ten-second flight without multiplying its duration by late ticks', async () => {
    delayTimerCallbacks(250)
    const adapter = new SimAdapter()
    const finished = vi.fn()
    const execution = adapter.execute(makeProgram([
      { type: 'takeoff', params: { altitudeCm: 100 } },
      { type: 'move', params: { direction: 'forward', distanceCm: 100, speedCmS: 30 } },
      { type: 'land' },
    ]), { onFinish: finished })
    try {
      await vi.advanceTimersByTimeAsync(11_000)
      expect(finished).toHaveBeenCalledTimes(1)
      expect(finished.mock.calls[0][0].success).toBe(true)
      expect(adapter.getState().pos[1]).toBeCloseTo(0)
      expect(adapter.getState().pos[2]).toBeCloseTo(100)
    } finally { adapter.stop(); await execution }
  })

  it('keeps rotation and hover durations independent of callback count', async () => {
    delayTimerCallbacks(250)
    const adapter = new SimAdapter()
    const finished = vi.fn()
    const execution = adapter.execute(makeProgram([
      { type: 'rotate', params: { degrees: 180 } },
      { type: 'hover', params: { durationMs: 1000 } },
    ]), { onFinish: finished })
    try {
      await vi.advanceTimersByTimeAsync(3500)
      expect(finished).toHaveBeenCalledTimes(1)
      expect(adapter.getState().heading).toBe(180)
    } finally { adapter.stop(); await execution }
  })

  it('times out an unmet condition after ten elapsed seconds rather than 200 callbacks', async () => {
    delayTimerCallbacks(250)
    const adapter = new SimAdapter()
    const finished = vi.fn()
    const execution = adapter.execute(makeProgram([
      { type: 'waitUntil', params: { condition: { sensor: 'battery', op: '<', value: 0 } } },
    ]), { onFinish: finished })
    try {
      await vi.advanceTimersByTimeAsync(10_000)
      expect(finished).toHaveBeenCalledTimes(1)
      expect(finished.mock.calls[0][0].success).toBe(false)
      expect(adapter.getFailureReason()).toContain('10 秒')
    } finally { adapter.stop(); await execution }
  })

  it('does not skip an obstacle between positions after a long-delayed callback', async () => {
    delayTimerCallbacks(2000)
    const adapter = new SimAdapter({ obstacles: [{ posCm: [0, 0, 50], radiusCm: 1 }] })
    const finished = vi.fn()
    const execution = adapter.execute(makeProgram([
      { type: 'move', params: { direction: 'forward', distanceCm: 100, speedCmS: 100 } },
    ]), { onFinish: finished })
    try {
      await vi.advanceTimersByTimeAsync(2000)
      expect(finished).toHaveBeenCalledTimes(1)
      expect(finished.mock.calls[0][0].success).toBe(false)
      expect(adapter.hasCollided()).toBe(true)
      expect(adapter.getState().pos[2]).toBeLessThanOrEqual(50)
      expect(finished.mock.calls[0][0].events).not.toContain('move forward 100cm')
    } finally { adapter.stop(); await execution }
  })

  it('preserves the speed multiplier while stopping immediately between delayed ticks', async () => {
    delayTimerCallbacks(250)
    const adapter = new SimAdapter({ speed: 2 })
    const finished = vi.fn()
    const execution = adapter.execute(makeProgram([
      { type: 'move', params: { direction: 'forward', distanceCm: 100, speedCmS: 100 } },
    ]), { onFinish: finished })
    await vi.advanceTimersByTimeAsync(250)
    expect(adapter.getState().pos[2]).toBeCloseTo(50)
    adapter.stop()
    await execution
    expect(adapter.getState().pos[2]).toBeCloseTo(50)
    expect(finished.mock.calls[0][0].success).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})

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
