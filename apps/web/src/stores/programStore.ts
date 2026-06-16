/**
 * programStore —— 编程器到仿真器的「运行交接」store。
 *
 * 职责单一：点「运行」时，编程器把编译好的 IR（CommandProgram）+ 当前 Blockly
 * XML 暂存在这里，然后跳转到仿真页；仿真页（工程师 C）读它来回放。
 *
 * 这是一次运行会话的临时交接，不是项目正式存储 —— 故**不做 persist**，
 * 刷新即清空，避免把一次运行误当成保存。
 */
import { create } from 'zustand'
import type { CommandProgram } from '@fwx/shared'

interface ProgramState {
  /** 最近一次「运行」交出的程序 IR */
  program: CommandProgram | null
  /** 对应的 Blockly 工作区 XML（便于仿真页需要时回链编程器） */
  blocklyXml: string | null
  /** 编程器交出一段程序 */
  setProgram: (program: CommandProgram, blocklyXml: string) => void
  /** 清空交接内容 */
  clear: () => void
}

export const useProgramStore = create<ProgramState>((set) => ({
  program: null,
  blocklyXml: null,
  setProgram: (program, blocklyXml) => set({ program, blocklyXml }),
  clear: () => set({ program: null, blocklyXml: null }),
}))
