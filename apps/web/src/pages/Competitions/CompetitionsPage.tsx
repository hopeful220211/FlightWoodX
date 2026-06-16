import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trophy, Calendar, Users, ArrowRight, Inbox, AlertCircle } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Card } from '../../components/common/Card'
import {
  useCompetitions,
  COMPETITION_STATUS_LABEL,
  COMPETITION_STATUS_CLASS,
} from '../../hooks/useCompetitions'

const PAGE_SIZE = 20

/** ISO 起止 → "2026年7月 — 2026年8月" */
function dateRange(start: string, end: string): string {
  const fmt = (s: string) => {
    const d = new Date(s)
    return `${d.getFullYear()}年${d.getMonth() + 1}月`
  }
  return `${fmt(start)} — ${fmt(end)}`
}

export function CompetitionsPage() {
  const nav = useNavigate()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useCompetitions(page, PAGE_SIZE)

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader title="赛事中心" />

      {/* loading */}
      {isLoading && (
        <div className="grid gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-sky-50" />
          ))}
        </div>
      )}

      {/* error */}
      {isError && (
        <Card className="text-center py-10">
          <AlertCircle size={28} className="mx-auto text-error mb-2" />
          <p className="text-sm text-ink-600">加载赛事失败：{(error as Error)?.message || '请稍后重试'}</p>
        </Card>
      )}

      {/* empty */}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <Card className="text-center py-12">
          <Inbox size={32} className="mx-auto text-sky-200 mb-2" />
          <p className="text-sm text-ink-500">暂时还没有开放的赛事，敬请期待</p>
        </Card>
      )}

      {/* list */}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <div className="grid gap-5">
            {data.items.map((comp) => (
              <Card
                key={comp.id}
                className="cursor-pointer transition hover:shadow-md"
                onClick={() => nav(`/competitions/${comp.id}`)}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={18} className="text-accent-gold" />
                      <h3 className="text-lg font-semibold text-ink-900">{comp.name}</h3>
                    </div>
                    <p className="text-sm text-ink-600 line-clamp-2">{comp.rulesDescription}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-ink-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} />
                        {dateRange(comp.startTime, comp.endTime)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users size={12} />
                        {comp.registeredCount} 人报名
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${COMPETITION_STATUS_CLASS[comp.status]}`}
                    >
                      {COMPETITION_STATUS_LABEL[comp.status]}
                    </span>
                    <ArrowRight size={16} className="text-ink-300" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-ink-600 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <span className="text-sm text-ink-500">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-ink-600 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </PageContainer>
  )
}
