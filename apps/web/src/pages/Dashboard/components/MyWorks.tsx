import { useMemo, useState } from 'react'
import { Plus, Plane } from 'lucide-react'
import { cn } from '../../../utils/cn'
import {
  WORK_CATEGORY_LABELS,
  WORK_SORT_LABELS,
  type DashboardWork,
  type WorkCategory,
  type WorkSortKey,
} from '../dashboardData'
import { WorkCard } from './WorkCard'

/** 「我的作品」模块（纯展示，过滤/排序为前端纯计算）。 */
export interface MyWorksProps {
  works: DashboardWork[]
  onNewDesign?: () => void
  onContinueEdit?: (w: DashboardWork) => void
  onPublish?: (w: DashboardWork) => void
  onDuplicate?: (w: DashboardWork) => void
  onDelete?: (w: DashboardWork) => void
}

type CategoryTabKey = 'all' | WorkCategory

/** 排序：稳定地按所选维度排列（不修改入参）。 */
function sortWorks(works: DashboardWork[], key: WorkSortKey): DashboardWork[] {
  const byTime = (iso: string) => new Date(iso).getTime() || 0
  return [...works].sort((a, b) => {
    switch (key) {
      case 'views':
        return b.views - a.views
      case 'likes':
        return b.likes - a.likes
      case 'created':
        // 无独立 createdAt 字段，退化为按 id 字典序（示例数据 id 单调递增 ≈ 创建顺序）。
        return a.id.localeCompare(b.id)
      case 'recent':
      default:
        return byTime(b.updatedAt) - byTime(a.updatedAt)
    }
  })
}

export function MyWorks({
  works,
  onNewDesign,
  onContinueEdit,
  onPublish,
  onDuplicate,
  onDelete,
}: MyWorksProps): JSX.Element {
  const [category, setCategory] = useState<CategoryTabKey>('all')
  const [sortKey, setSortKey] = useState<WorkSortKey>('recent')

  const visibleWorks = useMemo(() => {
    const filtered = category === 'all' ? works : works.filter((w) => w.category === category)
    return sortWorks(filtered, sortKey)
  }, [works, category, sortKey])

  const isEmptyAll = works.length === 0

  return (
    <section aria-labelledby="my-works-title" className="space-y-5">
      {/* 标题 + 主按钮 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="my-works-title" className="text-h3 font-bold text-sky-900">
          我的作品
        </h2>
        <button
          type="button"
          onClick={() => onNewDesign?.()}
          className="inline-flex items-center gap-1.5 rounded-pill bg-accent-spark px-5 py-2.5 text-sm font-semibold text-white shadow-sky-glow transition hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-spark"
        >
          <Plus className="h-4 w-4" aria-hidden />
          新建设计
        </button>
      </div>

      {!isEmptyAll ? (
        <>
          {/* 工具条：左分类 Tab + 右排序 */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="作品分类">
              {WORK_CATEGORY_LABELS.map((tab) => {
                const active = tab.key === category
                return (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategory(tab.key)}
                    className={cn(
                      'rounded-pill px-4 py-1.5 text-sm font-semibold transition',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-spark',
                      active
                        ? 'bg-accent-spark text-white shadow-sky-glow'
                        : 'bg-sky-50 text-sky-700 hover:bg-sky-100',
                    )}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <label className="flex items-center gap-2 text-sm text-sky-700">
              <span className="whitespace-nowrap">排序</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as WorkSortKey)}
                aria-label="作品排序"
                className="rounded-pill border border-sky-200 bg-white px-3.5 py-1.5 text-sm font-medium text-sky-900 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              >
                {WORK_SORT_LABELS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 作品卡网格：窄屏 2、平板 3、宽屏 4–5 */}
          {visibleWorks.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {visibleWorks.map((w) => (
                <WorkCard
                  key={w.id}
                  work={w}
                  onContinueEdit={onContinueEdit}
                  onPublish={onPublish}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          ) : (
            // 该分类下无作品（整体非空，仅当前 Tab 为空）
            <div className="rounded-card border border-dashed border-sky-200 bg-sky-50/50 p-10 text-center text-sm text-sky-700">
              这个分类下还没有作品，换个分类看看吧。
            </div>
          )}
        </>
      ) : (
        // 整体空状态
        <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-dashed border-sky-200 bg-gradient-to-br from-sky-50 to-white p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-400">
            <Plane className="h-8 w-8" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="max-w-sm text-base font-semibold text-sky-900">
            还没有作品，先从一架木艺四轴开始。
          </p>
          <button
            type="button"
            onClick={() => onNewDesign?.()}
            className="inline-flex items-center gap-1.5 rounded-pill bg-accent-spark px-6 py-3 text-sm font-semibold text-white shadow-sky-glow transition hover:brightness-110 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-spark"
          >
            <Plus className="h-4 w-4" aria-hidden />
            创建第一个设计
          </button>
        </div>
      )}
    </section>
  )
}
