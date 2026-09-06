/**
 * Blockly → CommandProgram IR 编译器。
 *
 * 遍历 Blockly workspace 的顶层 block 链，递归编译为
 * @fwx/shared 的 CommandProgram 结构。编译结果通过 zod schema 校验。
 *
 * 硬件解耦红线：编译产物只是 IR，不包含任何硬件特定代码。
 */
import * as Blockly from 'blockly'
import {
  CommandProgramSchema,
  COMMAND_PROTOCOL_VERSION,
  type Command,
  type CommandProgram,
  type Condition,
  type Direction,
  type Axis,
} from '@fwx/shared'

/** Compile the workspace into a validated CommandProgram */
export function compileWorkspace(
  workspace: Blockly.Workspace,
  meta: { name: string; author: string },
): CommandProgram {
  const topBlocks = workspace.getTopBlocks(true)
  const startBlocks = topBlocks.filter((b) => b.type === 'drone_start')

  // 「开始」锚点语义（向后兼容）：
  //   0 个 start → 回退：编译所有顶层链（老程序/无锚点时仍可用）
  //   1 个 start → 只编译它后面接的那串（start 自身只是锚点，不产指令）
  //   >1 个 start → 报错，不静默选一个
  let commands: Command[] = []
  if (startBlocks.length > 1) {
    throw new Error('只能有一个「开始」积木，请删掉多余的')
  } else if (startBlocks.length === 1) {
    commands = compileBlockChain(startBlocks[0].getNextBlock())
  } else {
    for (const block of topBlocks) {
      commands.push(...compileBlockChain(block))
    }
  }

  const program: CommandProgram = {
    version: COMMAND_PROTOCOL_VERSION,
    metadata: {
      name: meta.name,
      author: meta.author,
      createdAt: new Date().toISOString(),
    },
    commands,
  }

  // Validate through zod — throws if invalid
  return CommandProgramSchema.parse(program)
}

/** Walk a block chain (block + its nextConnection) and return commands */
function compileBlockChain(block: Blockly.Block | null): Command[] {
  const cmds: Command[] = []
  let current = block
  while (current) {
    const cmd = current.isEnabled() ? compileBlock(current) : null
    if (cmd) cmds.push(cmd)
    current = current.getNextBlock()
  }
  return cmds
}

/** Compile a single block into a Command */
function compileBlock(block: Blockly.Block): Command | null {
  switch (block.type) {
    case 'drone_takeoff':
      return {
        type: 'takeoff',
        params: { altitudeCm: block.getFieldValue('ALTITUDE') as number },
      }

    case 'drone_land':
      return { type: 'land' }

    case 'drone_move':
      return {
        type: 'move',
        params: {
          direction: block.getFieldValue('DIRECTION') as Direction,
          distanceCm: block.getFieldValue('DISTANCE') as number,
          speedCmS: block.getFieldValue('SPEED') as number,
        },
      }

    case 'drone_rotate':
      return {
        type: 'rotate',
        params: { degrees: block.getFieldValue('DEGREES') as number },
      }

    case 'drone_hover':
      return {
        type: 'hover',
        params: { durationMs: block.getFieldValue('DURATION') as number },
      }

    case 'drone_led':
      return {
        type: 'led',
        params: {
          r: block.getFieldValue('R') as number,
          g: block.getFieldValue('G') as number,
          b: block.getFieldValue('B') as number,
        },
      }

    case 'drone_wait_until': {
      const condition = compileConditionInput(block, 'CONDITION')
      return { type: 'waitUntil', params: { condition } }
    }

    case 'drone_lock_axis': {
      const axes: Axis[] = []
      if (block.getFieldValue('FORWARD') === 'TRUE') axes.push('forward')
      if (block.getFieldValue('LATERAL') === 'TRUE') axes.push('lateral')
      if (block.getFieldValue('VERTICAL') === 'TRUE') axes.push('vertical')
      return { type: 'lockAxis', params: { axes } }
    }

    case 'drone_if_else': {
      const condition = compileConditionInput(block, 'CONDITION')
      const thenBlock = block.getInputTargetBlock('THEN')
      const elseBlock = block.getInputTargetBlock('ELSE')
      return {
        type: 'ifElse',
        params: {
          condition,
          then: compileBlockChain(thenBlock),
          ...(elseBlock ? { else: compileBlockChain(elseBlock) } : {}),
        },
      }
    }

    case 'drone_repeat': {
      const bodyBlock = block.getInputTargetBlock('BODY')
      return {
        type: 'repeat',
        params: {
          times: block.getFieldValue('TIMES') as number,
          body: compileBlockChain(bodyBlock),
        },
      }
    }

    case 'drone_while': {
      const condition = compileConditionInput(block, 'CONDITION')
      const bodyBlock = block.getInputTargetBlock('BODY')
      return {
        type: 'while',
        params: {
          condition,
          body: compileBlockChain(bodyBlock),
        },
      }
    }

    case 'drone_start':
    case 'drone_condition':
      return null
    default:
      throw new Error(`无法识别积木：${block.type}`)
  }
}

/** Extract a Condition from a value input that expects a drone_condition block */
function compileConditionInput(block: Blockly.Block, inputName: string): Condition {
  const condBlock = block.getInputTargetBlock(inputName)
  if (!condBlock || condBlock.type !== 'drone_condition' || !condBlock.isEnabled()) {
    throw new Error('请给逻辑或循环积木连接一个有效的条件积木')
  }

  return {
    sensor: condBlock.getFieldValue('SENSOR') as Condition['sensor'],
    op: condBlock.getFieldValue('OP') as Condition['op'],
    value: condBlock.getFieldValue('VALUE') as number,
  }
}
