// src/stores/programStore.ts
// 积木编程器的本地持久化：保存「当前程序」（Blockly XML + 编译后的 IR）。
// 与 designStore 同样的极简策略——离开编程页后程序不丢，项目详情页可读取它做预览。
// 后端持久化是 M3 的工作（见 CodingPage handleSave 注释）。
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CommandProgram } from '@fwx/shared'
import { STORAGE_KEYS } from '../constants/storageKeys'

interface ProgramState {
  blocklyXml: string
  commandProgram: CommandProgram | null
  updatedAt: string | null
  /** 后端 Program 记录 id；存在则保存走 PATCH，否则 POST 新建（避免重复落库）。 */
  serverId: string | null
  setProgram: (blocklyXml: string, commandProgram: CommandProgram) => void
  setServerId: (serverId: string | null) => void
  clearProgram: () => void
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set) => ({
      blocklyXml: '',
      commandProgram: null,
      updatedAt: null,
      serverId: null,
      setProgram: (blocklyXml, commandProgram) =>
        set({ blocklyXml, commandProgram, updatedAt: new Date().toISOString() }),
      setServerId: (serverId) => set({ serverId }),
      clearProgram: () => set({ blocklyXml: '', commandProgram: null, updatedAt: null, serverId: null }),
    }),
    {
      name: STORAGE_KEYS.PROGRAM_STORE,
    },
  ),
)

/** Standalone clear — used by authStore on logout to avoid circular deps（学校共享电脑，程序不串号）。 */
export function clearProgramStore() {
  useProgramStore.getState().clearProgram()
}
