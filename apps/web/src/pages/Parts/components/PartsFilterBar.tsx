/**
 * PartsFilterBar — 零件库搜索 / 重量范围筛选。
 * 受控组件：值与回调由页面经 URL query 驱动（可分享、后退可用）。
 */
import { Search } from 'lucide-react'
import { Input } from '../../../components/common/Input'

export interface PartsFilterValue {
  q: string
  wmin: string
  wmax: string
}

interface PartsFilterBarProps {
  value: PartsFilterValue
  onChange: (patch: Partial<PartsFilterValue>) => void
  /** 是否展示重量范围筛选（分类内列表 / 搜索结果时展示） */
  showWeight?: boolean
}

export function PartsFilterBar({ value, onChange, showWeight = true }: PartsFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative max-w-md flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <Input
          className="pl-9"
          placeholder="搜索零件名称 / 编号 / 标签..."
          value={value.q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
      </div>

      {showWeight && (
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <span className="shrink-0">重量</span>
          <Input
            type="number"
            min={0}
            className="w-20"
            placeholder="最小"
            value={value.wmin}
            onChange={(e) => onChange({ wmin: e.target.value })}
            aria-label="最小重量（克）"
          />
          <span aria-hidden="true">–</span>
          <Input
            type="number"
            min={0}
            className="w-20"
            placeholder="最大"
            value={value.wmax}
            onChange={(e) => onChange({ wmax: e.target.value })}
            aria-label="最大重量（克）"
          />
          <span className="shrink-0 text-ink-400">克</span>
        </div>
      )}
    </div>
  )
}
