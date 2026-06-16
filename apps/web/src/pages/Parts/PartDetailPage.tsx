/**
 * PartDetailPage — 单个零件详情（/parts/:id）。
 *
 * P0：静态大图 + 元数据（中文名/编号/类别/重量/标签）+ 「这是什么」说明
 * （说明取自 parts-schema 的 STEP_INFO，不自造文案）。
 * Live 3D（复用单 Canvas PartPreview3D）为 P1，本页不实装。
 */
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, PackageOpen } from 'lucide-react'
import { CATEGORY_LABELS, STEP_INFO, getCategoryStep } from '@fwx/parts-schema'
import { PageContainer } from '../../components/layout/PageContainer'
import { Card } from '../../components/common/Card'
import { Badge } from '../../components/common/Badge'
import { EmptyState } from '../../components/common/EmptyState'
import { getPartById } from '../../data/parts'

export function PartDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const part = getPartById(id)

  if (!part) {
    return (
      <PageContainer className="py-16">
        <EmptyState
          icon={<PackageOpen size={22} />}
          title="找不到这个零件"
          description={`没有编号为「${id}」的零件`}
          action={{ label: '返回零件库', onClick: () => navigate('/parts') }}
        />
      </PageContainer>
    )
  }

  const step = getCategoryStep(part.category)
  const intro = step ? STEP_INFO[step].description : ''
  const categoryLabel = CATEGORY_LABELS[part.category].zh

  return (
    <PageContainer className="space-y-6 py-8">
      <Link
        to={`/parts?category=${part.category}`}
        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
      >
        <ChevronLeft size={16} /> 返回{categoryLabel}列表
      </Link>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 大图（静态缩略图） */}
        <Card className="flex items-center justify-center">
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-wood-50">
            {part.thumbnailUrl ? (
              <img src={part.thumbnailUrl} alt={part.name} className="h-full w-full object-contain p-6" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-ink-400">无预览图</div>
            )}
          </div>
        </Card>

        {/* 元数据 */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink-900">{part.name}</h1>
              {part.isEssential && <Badge variant="featured">初学者</Badge>}
            </div>
            <p className="mt-1 font-mono text-sm text-ink-400">{part.partNumber}</p>
          </div>

          {intro && (
            <div className="rounded-xl border border-sky-100 bg-sky-50/60 p-4 text-sm text-ink-600">
              {intro}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs text-ink-400">类别</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{categoryLabel}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">重量</dt>
              <dd className="mt-0.5 font-semibold text-ink-900">{part.weight} 克</dd>
            </div>
          </dl>

          {part.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {part.tags.map((t) => (
                <span key={t} className="rounded-full bg-wood-100 px-3 py-1 text-xs text-wood-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
