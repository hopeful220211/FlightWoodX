import { AlertTriangle, Check, Loader2 } from 'lucide-react'

/**
 * 右上角自动保存状态：保存中 → 已保存。代替原来的「保存并退出」按钮。
 * 数据来自 useDesignSync 的 saveStatus（内容一改动就防抖自动保存）。
 */
export function AutoSaveIndicator({ status }: { status: 'saving' | 'saved' | 'error' }) {
  if (status === 'saving') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        保存中…
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
        同步失败
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-600">
      <Check className="h-3.5 w-3.5" aria-hidden />
      已保存
    </span>
  )
}
