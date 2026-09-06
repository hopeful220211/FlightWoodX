// features/partStudio/MyPartsStrip.tsx
//
// 「我的零件」横向列表：展示已保存到服务器的自制零件（M2 验证「刷新后还在」的地方）。
// 预览用存下来的 SVG 轮廓直接内联渲染 —— 零 WebGL、零缩略图依赖，还能证明数据真的落库回环。

import type { UserPartDTO } from '@fwx/parts-schema'
import { Trash2 } from 'lucide-react'

const CATEGORY_LABEL: Record<string, string> = {
  guard: '保护罩',
  joint: '衔接件',
  deco: '装饰',
  landing: '机臂',
}

interface MyPartsStripProps {
  parts: UserPartDTO[]
  onDelete: (id: string) => void
}

export function MyPartsStrip({ parts, onDelete }: MyPartsStripProps) {
  return (
    <section className="shrink-0 border-t border-[#E2ECF7] bg-white px-5 py-3">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">
        我的零件 <span className="font-normal text-slate-400">（{parts.length}）</span>
      </h2>
      {parts.length === 0 ? (
        <p className="text-xs text-slate-400">画一个形状、起个名字，点「保存」，它就会出现在这里。</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {parts.map((p) => (
            <PartChip key={p.id} part={p} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  )
}

function PartChip({ part, onDelete }: { part: UserPartDTO; onDelete: (id: string) => void }) {
  const { contour, bboxMm } = part.geometry
  const w = bboxMm?.w || 1
  const h = bboxMm?.h || 1
  const pad = Math.max(w, h) * 0.08 + 1
  const stroke = Math.max(0.4, Math.max(w, h) / 80)

  return (
    <div className="group relative w-24 shrink-0 rounded-xl border border-[#E2ECF7] bg-[#F5F9FF] p-2">
      <div className="flex h-16 w-full items-center justify-center">
        <svg
          viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <path d={contour} fill="rgba(30,155,255,0.15)" stroke="#1E9BFF" strokeWidth={stroke} />
        </svg>
      </div>
      <p className="mt-1 truncate text-center text-xs font-medium text-slate-700" title={part.name}>
        {part.name}
      </p>
      <p className="text-center text-[10px] text-slate-400">
        {CATEGORY_LABEL[part.category] ?? part.category}
      </p>
      <button
        type="button"
        onClick={() => onDelete(part.id)}
        className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow transition hover:text-[#D34141]"
        aria-label={`删除 ${part.name}`}
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}
