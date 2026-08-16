/**
 * flightPlan —— 把指令协议 IR 翻译成「大白话飞行计划」。
 *
 * 这是给 6–15 岁孩子看的展示层：把 CommandProgram 里每条指令译成一行
 * 看得懂的中文（带缩进层级表达嵌套）。
 *
 * 红线：只 import @fwx/shared 的 IR 类型，不重复定义、不改 IR 结构。
 * 本文件是纯函数（无 React / DOM 依赖），便于单测。
 */
import type { Command, CommandProgram, Condition, Direction, Axis } from '@fwx/shared'

/** 飞行计划里的一行。`kind` 给 UI 决定用哪个图标；`colorHex` 仅 led 行有。 */
export interface PlanLine {
  /** 缩进层级：0 = 顶层，循环/分支体 +1 */
  depth: number
  /** 行类别，UI 据此选图标 */
  kind: PlanLineKind
  /** 大白话文案 */
  text: string
  /** 仅 led 行：灯光颜色，供 UI 画色块 */
  colorHex?: string
}

export type PlanLineKind =
  | 'takeoff' | 'land' | 'move' | 'rotate' | 'hover' | 'led'
  | 'if' | 'else' | 'repeat' | 'while' | 'waitUntil' | 'lockAxis'

// ===== 中文映射（普通对象，类型来自 @fwx/shared） =====

const DIRECTION_CN: Record<Direction, string> = {
  forward: '前', back: '后', left: '左', right: '右', up: '上', down: '下',
}

const AXIS_CN: Record<Axis, string> = {
  forward: '前后', lateral: '左右', vertical: '升降',
}

const SENSOR_CN: Record<Condition['sensor'], { label: string; unit: string }> = {
  frontDistanceCm: { label: '前方距离', unit: '厘米' },
  downDistanceCm: { label: '对地距离', unit: '厘米' },
  battery: { label: '电量', unit: '%' },
}

const OP_CN: Record<Condition['op'], string> = {
  '<': '小于', '>': '大于', '==': '等于',
}

/** 把传感器条件译成「前方距离 小于 30 厘米」 */
function describeCondition(c: Condition): string {
  const s = SENSOR_CN[c.sensor]
  return `${s.label} ${OP_CN[c.op]} ${c.value} ${s.unit}`.replace(' %', '%')
}

/** [0,255] rgb → #rrggbb */
function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

/** 把一条指令（可能带子句）翻成若干行，追加到 out。 */
function describeCommand(cmd: Command, depth: number, out: PlanLine[]): void {
  switch (cmd.type) {
    case 'takeoff':
      out.push({ depth, kind: 'takeoff', text: `起飞到 ${cmd.params.altitudeCm} 厘米` })
      break
    case 'land':
      out.push({ depth, kind: 'land', text: '降落' })
      break
    case 'move':
      out.push({ depth, kind: 'move', text: `向${DIRECTION_CN[cmd.params.direction]}飞 ${cmd.params.distanceCm} 厘米` })
      break
    case 'rotate': {
      const deg = cmd.params.degrees
      const text = deg === 0 ? '原地不转'
        : deg > 0 ? `向右转 ${deg}°`
        : `向左转 ${Math.abs(deg)}°`
      out.push({ depth, kind: 'rotate', text })
      break
    }
    case 'hover':
      out.push({ depth, kind: 'hover', text: `悬停 ${cmd.params.durationMs / 1000} 秒` })
      break
    case 'led':
      out.push({
        depth, kind: 'led', text: '灯光变颜色',
        colorHex: rgbToHex(cmd.params.r, cmd.params.g, cmd.params.b),
      })
      break
    case 'waitUntil':
      out.push({ depth, kind: 'waitUntil', text: `等到「${describeCondition(cmd.params.condition)}」` })
      break
    case 'lockAxis': {
      const axes = cmd.params.axes.map(a => AXIS_CN[a]).join('、')
      out.push({ depth, kind: 'lockAxis', text: axes ? `锁定 ${axes} 方向` : '锁定方向' })
      break
    }
    case 'repeat':
      out.push({ depth, kind: 'repeat', text: `重复 ${cmd.params.times} 次：` })
      cmd.params.body.forEach(c => describeCommand(c, depth + 1, out))
      break
    case 'while':
      out.push({ depth, kind: 'while', text: `当「${describeCondition(cmd.params.condition)}」时，重复：` })
      cmd.params.body.forEach(c => describeCommand(c, depth + 1, out))
      break
    case 'ifElse':
      out.push({ depth, kind: 'if', text: `如果「${describeCondition(cmd.params.condition)}」，就：` })
      cmd.params.then.forEach(c => describeCommand(c, depth + 1, out))
      if (cmd.params.else && cmd.params.else.length > 0) {
        out.push({ depth, kind: 'else', text: '否则：' })
        cmd.params.else.forEach(c => describeCommand(c, depth + 1, out))
      }
      break
  }
}

/** 把整段程序译成大白话飞行计划（顺序、带缩进层级）。 */
export function describeProgram(program: CommandProgram): PlanLine[] {
  const out: PlanLine[] = []
  program.commands.forEach(cmd => describeCommand(cmd, 0, out))
  return out
}
