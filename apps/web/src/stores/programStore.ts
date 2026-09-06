// src/stores/programStore.ts
// 积木程序按本地 designId 隔离持久化；同一浏览器可同时保留多架无人机的草稿。
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CommandProgramSchema, type CommandProgram } from '@fwx/shared'
import { STORAGE_KEYS } from '../constants/storageKeys'

export interface ProgramDraft {
  blocklyXml: string
  commandProgram: CommandProgram | null
  updatedAt: string | null
  /** 与该作品绑定的后端 Program id。 */
  serverId: string | null
  /** 最近一次已确认云端绑定的 XML；用于区分本地修改和缓存。 */
  syncedXml?: string | null
}

interface PersistedProgramState {
  draftsByDesignId: Record<string, ProgramDraft>
  /** 旧版无法判断所属作品的草稿；仅保留，不自动绑定到任何作品。 */
  legacyDraft: ProgramDraft | null
}

interface ProgramState extends PersistedProgramState {
  getDraft: (designId: string) => ProgramDraft | null
  claimLegacyDraft: (designId: string) => ProgramDraft | null
  setProgram: (designId: string, blocklyXml: string, commandProgram: CommandProgram | null) => void
  markSynced: (designId: string, blocklyXml: string) => void
  setServerId: (designId: string, serverId: string | null) => void
  clearProgram: (designId: string) => void
  clearAllPrograms: () => void
}

const PROGRAM_STORE_VERSION = 2

function asLegacyDraft(value: unknown): ProgramDraft | null {
  if (!value || typeof value !== 'object') return null
  const legacy = value as Partial<ProgramDraft>
  const hasData =
    typeof legacy.blocklyXml === 'string' && legacy.blocklyXml.length > 0
      ? true
      : legacy.commandProgram != null || legacy.serverId != null || legacy.updatedAt != null
  if (!hasData) return null
  return {
    blocklyXml: typeof legacy.blocklyXml === 'string' ? legacy.blocklyXml : '',
    commandProgram: CommandProgramSchema.safeParse(legacy.commandProgram).success ? legacy.commandProgram! : null,
    updatedAt: typeof legacy.updatedAt === 'string' ? legacy.updatedAt : null,
    serverId: typeof legacy.serverId === 'string' ? legacy.serverId : null,
  }
}

/** Zustand persist migration：保留未绑定旧程序，禁止打开作品时自动推断归属。 */
export function migrateProgramStoreState(
  persistedState: unknown,
  version: number,
): PersistedProgramState {
  if (version >= PROGRAM_STORE_VERSION && persistedState && typeof persistedState === 'object') {
    const current = persistedState as Partial<PersistedProgramState>
    return {
      draftsByDesignId: Object.fromEntries(
        Object.entries(current.draftsByDesignId ?? {}).flatMap(([id, value]) => {
          const draft = asLegacyDraft(value)
          return draft ? [[id, { ...draft, syncedXml: typeof value?.syncedXml === 'string' ? value.syncedXml : null }]] : []
        }),
      ),
      legacyDraft: asLegacyDraft(current.legacyDraft),
    }
  }

  return {
    draftsByDesignId: {},
    legacyDraft: asLegacyDraft(persistedState),
  }
}

export const useProgramStore = create<ProgramState>()(
  persist(
    (set, get) => ({
      draftsByDesignId: {},
      legacyDraft: null,
      getDraft: (designId) => get().draftsByDesignId[designId] ?? null,
      claimLegacyDraft: (designId) => {
        const existing = get().draftsByDesignId[designId]
        if (existing) return existing

        const legacyDraft = get().legacyDraft
        if (!legacyDraft) return null
        set((state) => ({
          draftsByDesignId: { ...state.draftsByDesignId, [designId]: legacyDraft },
          legacyDraft: null,
        }))
        return legacyDraft
      },
      setProgram: (designId, blocklyXml, commandProgram) =>
        set((state) => ({
          draftsByDesignId: {
            ...state.draftsByDesignId,
            [designId]: {
              blocklyXml,
              commandProgram,
              updatedAt: new Date().toISOString(),
              serverId: state.draftsByDesignId[designId]?.serverId ?? null,
              syncedXml: state.draftsByDesignId[designId]?.syncedXml ?? null,
            },
          },
        })),
      markSynced: (designId, blocklyXml) => set((state) => {
        const current = state.draftsByDesignId[designId]
        return current ? { draftsByDesignId: {
          ...state.draftsByDesignId, [designId]: { ...current, syncedXml: blocklyXml },
        } } : {}
      }),
      setServerId: (designId, serverId) =>
        set((state) => {
          const current = state.draftsByDesignId[designId]
          return {
            draftsByDesignId: {
              ...state.draftsByDesignId,
              [designId]: {
                blocklyXml: current?.blocklyXml ?? '',
                commandProgram: current?.commandProgram ?? null,
                updatedAt: current?.updatedAt ?? null,
                serverId,
                syncedXml: current?.syncedXml ?? null,
              },
            },
          }
        }),
      clearProgram: (designId) =>
        set((state) => {
          const next = { ...state.draftsByDesignId }
          delete next[designId]
          return { draftsByDesignId: next }
        }),
      clearAllPrograms: () => set({ draftsByDesignId: {}, legacyDraft: null }),
    }),
    {
      name: STORAGE_KEYS.PROGRAM_STORE,
      version: PROGRAM_STORE_VERSION,
      migrate: migrateProgramStoreState,
      merge: (persisted, current) => ({ ...current, ...migrateProgramStoreState(persisted, PROGRAM_STORE_VERSION) }),
      partialize: (state) => ({
        draftsByDesignId: state.draftsByDesignId,
        legacyDraft: state.legacyDraft,
      }),
    },
  ),
)

/** Standalone clear — used by authStore on logout（学校共享电脑，程序不串号）。 */
export function clearProgramStore() {
  useProgramStore.getState().clearAllPrograms()
}
