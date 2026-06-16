import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Medal, AlertCircle, Inbox, Play } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { Breadcrumb } from '../../components/common/Breadcrumb'
import { Card } from '../../components/common/Card'
import { useLeaderboard } from '../../hooks/useCompetitions'

const rankColor = ['text-accent-gold', 'text-ink-400', 'text-wood-500']

export function LeaderboardPage() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, error } = useLeaderboard(id, page)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <PageContainer className="py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: '赛事中心', to: '/competitions' },
          { label: '赛事详情', to: `/competitions/${id}` },
          { label: '排行榜' },
        ]}
      />

      <h1 className="text-2xl font-bold text-ink-900">排行榜</h1>

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-sky-50" />
          ))}
        </div>
      )}

      {isError && (
        <Card className="text-center py-10">
          <AlertCircle size={28} className="mx-auto text-error mb-2" />
          <p className="text-sm text-ink-600">{(error as Error)?.message || '加载排行榜失败'}</p>
        </Card>
      )}

      {!isLoading && !isError && data && data.items.length === 0 && (
        <Card className="text-center py-12">
          <Inbox size={32} className="mx-auto text-sky-200 mb-2" />
          <p className="text-sm text-ink-500">还没有成绩，提交作品并经评审录入后将出现在这里</p>
        </Card>
      )}

      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <Card hoverable={false} className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-sky-50 text-ink-500">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-16">名次</th>
                  <th className="px-4 py-3 text-left font-medium">选手 / 作品</th>
                  <th className="px-4 py-3 text-right font-medium w-20">总分</th>
                  <th className="px-4 py-3 text-right font-medium w-24">回放</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.submissionId} className="border-t border-sky-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 font-semibold ${rankColor[row.rank - 1] || 'text-ink-400'}`}>
                        {row.rank <= 3 && <Medal size={15} />}
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink-800">{row.userName}</div>
                      <div className="text-xs text-ink-400">{row.projectName}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-sky-600">{row.total}</td>
                    <td className="px-4 py-3 text-right">
                      {/* 回放观战为 P1（依赖 RFC-015 仿真），先禁用 */}
                      <button
                        type="button"
                        disabled
                        title="回放即将上线"
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-300 cursor-not-allowed"
                      >
                        <Play size={13} /> 回放
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-ink-600 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                上一页
              </button>
              <span className="text-sm text-ink-500">{page} / {totalPages}</span>
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
