import { describe, expect, it } from 'vitest'
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

  it('caps unvalidated input at the protocol maximum', async () => {
    const started: Command[] = []
    const adapter = new SimAdapter()

    await adapter.execute(programWithWhile(COMMAND_LIMITS.maxWhileIterations + 1), {
      onCommandStart: (_index, command) => started.push(command),
    })

    expect(started.filter((command) => command.type === 'led')).toHaveLength(
      COMMAND_LIMITS.maxWhileIterations,
    )
  })
})
