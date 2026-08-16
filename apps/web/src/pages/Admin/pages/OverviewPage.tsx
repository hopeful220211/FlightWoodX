import { useQuery } from '@tanstack/react-query'
import { Users, BookOpen, Boxes, Loader2, AlertCircle } from 'lucide-react'
import { getAdminApi } from '../../../api/admin'
import { BigStat } from '../../../components/common/BigStat'

export function AdminOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async () => {
      const api = await getAdminApi()
      const res = await api.getOverview()
      if (!res.success) throw new Error(res.error.message)
      return res.data
    },
  })

  return (
    <div className="space-y-8">
      <h1 className="text-h3 font-semibold tracking-tight text-sky-900">概览</h1>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sky-400">
          <Loader2 size={22} className="animate-spin" />
          <span className="ml-2 text-sm">加载中…</span>
        </div>
      ) : error || !data ? (
        <div className="flex flex-col items-center justify-center rounded-card border border-sky-100 bg-surface-white py-12 text-center">
          <AlertCircle size={28} className="mb-2 text-error" />
          <p className="text-body text-sky-700">{error instanceof Error ? error.message : '加载失败'}</p>
        </div>
      ) : (
        <>
          {/* 统计卡 */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-card border border-sky-100 bg-surface-white p-6">
              <div className="mb-4 flex items-center gap-2 text-sky-500">
                <Users size={16} />
                <span className="text-label uppercase">用户</span>
              </div>
              <BigStat value={data.users.total} label={`学生 ${data.users.students} · 教师 ${data.users.teachers} · 管理员 ${data.users.admins}`} />
            </div>
            <div className="rounded-card border border-sky-100 bg-surface-white p-6">
              <div className="mb-4 flex items-center gap-2 text-sky-500">
                <BookOpen size={16} />
                <span className="text-label uppercase">课程</span>
              </div>
              <BigStat value={data.courses.total} label={`已发布 ${data.courses.published}`} />
            </div>
            <div className="rounded-card border border-sky-100 bg-surface-white p-6">
              <div className="mb-4 flex items-center gap-2 text-sky-500">
                <Boxes size={16} />
                <span className="text-label uppercase">零件</span>
              </div>
              <BigStat value={data.parts.total} label={`待审核 ${data.parts.pendingReview}`} />
            </div>
          </div>

          {/* 最近审计 */}
          <div className="rounded-card border border-sky-100 bg-surface-white p-6">
            <h2 className="mb-4 text-title-sm font-semibold text-sky-900">最近操作</h2>
            <ul className="divide-y divide-sky-50">
              {data.recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-sky-700">
                    <span className="font-medium">{a.actor}</span> · {a.action} · {a.target}
                  </span>
                  <span className="shrink-0 font-grotesk text-xs text-sky-400">{a.at.slice(0, 16).replace('T', ' ')}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
