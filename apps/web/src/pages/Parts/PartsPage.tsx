/**
 * PartsPage — 零件库（分类浏览 → 分类内列表 → 详情）。
 *
 * 数据来源：@fwx/parts-schema（分类码 / 中文名 / 数量全部派生，无硬编码旧码）。
 * 列表用静态缩略图 <img>（PartCard），全页零 WebGL context，避免白屏。
 * 筛选状态走 URL query（category / q / wmin / wmax / page），可分享、可后退。
 */
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, PackageOpen, SearchX } from 'lucide-react'
import {
  CATEGORY_LABELS,
  getPopulatedCategories,
  getPartCategoryInfo,
  type PartCategory,
} from '@fwx/parts-schema'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { EmptyState } from '../../components/common/EmptyState'
import { partsData } from '../../data/parts'
import { PartCard } from './components/PartCard'
import { PartsFilterBar, type PartsFilterValue } from './components/PartsFilterBar'

const PAGE_SIZE = 24

/** 类别卡配色（纯展示，不承载语义） */
const CATEGORY_COLOR: Record<string, string> = {
  mainboard: 'bg-sky-100 text-sky-700',
  landing: 'bg-wood-100 text-wood-700',
  guard: 'bg-accent-leaf/20 text-accent-leaf',
  joint: 'bg-accent-gold/20 text-accent-gold',
  MOTOR: 'bg-sky-100 text-sky-600',
  PROP: 'bg-wood-100 text-wood-600',
}

function parseWeight(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function PartsPage() {
  const [params, setParams] = useSearchParams()

  const populated = useMemo(() => getPopulatedCategories(), [])
  const totalParts = partsData.length

  const categoryParam = params.get('category') ?? ''
  const category = (populated as string[]).includes(categoryParam) ? (categoryParam as PartCategory) : null
  const invalidCategory = categoryParam !== '' && category === null
  const q = params.get('q') ?? ''
  const wmin = params.get('wmin') ?? ''
  const wmax = params.get('wmax') ?? ''

  // 列表模式：选了类别 / 搜了关键字 / 用了重量筛选
  const listMode = category !== null || q.trim() !== '' || wmin !== '' || wmax !== '' || invalidCategory

  const filtered = useMemo(() => {
    if (invalidCategory) return [] // 非法分类 → 空态（不退化成展示全部）
    const ql = q.trim().toLowerCase()
    const lo = parseWeight(wmin)
    const hi = parseWeight(wmax)
    return partsData.filter((p) => {
      if (category && p.category !== category) return false
      if (ql) {
        const hit =
          p.name.toLowerCase().includes(ql) ||
          p.partNumber.toLowerCase().includes(ql) ||
          p.tags.some((t) => t.toLowerCase().includes(ql))
        if (!hit) return false
      }
      if (lo !== null && p.weight < lo) return false
      if (hi !== null && p.weight > hi) return false
      return true
    })
  }, [invalidCategory, category, q, wmin, wmax])

  // 每页条数支持 ?pageSize=（默认 24，1–96 之间）
  const pageSize = Math.min(Math.max(1, Number(params.get('pageSize')) || PAGE_SIZE), 96)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(Math.max(1, Number(params.get('page')) || 1), totalPages)
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize)

  // 默认 push（分类切换 / 翻页 → 浏览器后退可回上一步）；搜索/重量输入传 replace 避免历史刷屏。
  function update(
    patch: Record<string, string | number | null>,
    opts?: { keepPage?: boolean; replace?: boolean },
  ) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(patch)) {
          if (v === '' || v === null) next.delete(k)
          else next.set(k, String(v))
        }
        if (!opts?.keepPage) next.delete('page')
        return next
      },
      { replace: opts?.replace ?? false },
    )
  }

  const filterValue: PartsFilterValue = { q, wmin, wmax }

  return (
    <PageContainer className="space-y-6 py-8">
      <PageHeader
        title="零件库"
        description={`${totalParts} 个标准化木质零件 · ${populated.length} 大类别 · 榫卯结构`}
      />

      {/* 顶部搜索 / 筛选（列表模式才显示重量范围） */}
      <PartsFilterBar
        value={filterValue}
        onChange={(patch) => update(patch, { replace: true })}
        showWeight={listMode}
      />

      {!listMode ? (
        /* —— 第一层：分类浏览 —— */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {populated.map((cat) => {
            const info = getPartCategoryInfo(cat)
            return (
              <Card
                key={cat}
                className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lift"
                onClick={() => update({ category: cat })}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${CATEGORY_COLOR[cat] ?? 'bg-sky-100 text-sky-700'}`}
                  >
                    {info.label}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-ink-900">{info.label}</h3>
                    <p className="mt-0.5 text-sm text-ink-400">{info.count} 个零件</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* —— 第二层：分类内 / 搜索结果列表 —— */
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setParams({})}
              className="inline-flex items-center gap-1 text-sm text-sky-600 hover:text-sky-700"
            >
              <ChevronLeft size={16} /> 全部分类
            </button>
            <p className="text-sm text-ink-400">
              {category ? CATEGORY_LABELS[category].zh : '搜索结果'} · 共 {filtered.length} 个
            </p>
          </div>

          {pageItems.length === 0 ? (
            <EmptyState
              icon={invalidCategory ? <PackageOpen size={22} /> : <SearchX size={22} />}
              title={invalidCategory ? '分类不存在' : '没有匹配的零件'}
              description={invalidCategory ? '换个分类看看吧' : '试试调整关键字或重量范围'}
              action={{ label: '返回全部分类', onClick: () => setParams({}) }}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {pageItems.map((p) => (
                  <PartCard key={p.id} part={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => update({ page: page - 1 }, { keepPage: true })}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-ink-500">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => update({ page: page + 1 }, { keepPage: true })}
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </PageContainer>
  )
}
