/**
 * PartCard — 零件列表卡片。
 *
 * 关键：用预生成静态缩略图 <img>，**不实例化任何 WebGL Canvas**，
 * 这样一页展示 39+ 零件也不会触发浏览器 WebGL context 上限（白屏根因）。
 */
import { Link } from 'react-router-dom'
import { CATEGORY_LABELS } from '@fwx/parts-schema'
import { Card } from '../../../components/common/Card'
import { Badge } from '../../../components/common/Badge'
import type { Part } from '../../../types/design'

export function PartCard({ part }: { part: Part }) {
  return (
    <Link to={`/parts/${part.id}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded-2xl">
      <Card className="h-full cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex flex-col gap-3">
          <div className="aspect-square overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-wood-50">
            {part.thumbnailUrl ? (
              <img
                src={part.thumbnailUrl}
                alt={part.name}
                loading="lazy"
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-ink-400">无预览图</div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate font-semibold text-ink-900">{part.name}</h3>
              {part.isEssential && <Badge variant="featured">初学者</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-ink-400">
              {CATEGORY_LABELS[part.category].zh} · {part.weight}g
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}
