// src/stores/editorTabsStore.ts
//
// 编辑器「打开的标签」——像浏览器/飞书那样，可同时打开多个无人机项目。
// 只记录“打开了哪些项目 id”和顺序；项目名、内容都从 designStore 取，这里不复制。
// 持久化：刷新后标签栏还在（更像真正的工作区）。已删除的项目 id 由 EditorLayout 渲染时按
// designStore 是否存在过滤掉，所以这里不需要主动清理。
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface EditorTabsState {
  /** 已打开的项目 id，按打开先后排序（最左是先打开的）。 */
  openTabIds: string[]
  /** 打开一个项目标签（已打开则不重复加）。 */
  openTab: (id: string) => void
  /** 关闭一个项目标签。 */
  closeTab: (id: string) => void
  /** 清空所有标签（退出登录等场景）。 */
  clearTabs: () => void
}

export const useEditorTabsStore = create<EditorTabsState>()(
  persist(
    (set) => ({
      openTabIds: [],
      openTab: (id) =>
        set((s) => (s.openTabIds.includes(id) ? s : { openTabIds: [...s.openTabIds, id] })),
      closeTab: (id) =>
        set((s) => ({ openTabIds: s.openTabIds.filter((t) => t !== id) })),
      clearTabs: () => set({ openTabIds: [] }),
    }),
    { name: 'fwx_editor_open_tabs' },
  ),
)
