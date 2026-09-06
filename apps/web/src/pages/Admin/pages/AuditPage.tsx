import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCw, ScrollText } from 'lucide-react'
import { realAdminApi } from '../../../api/admin/realClient'
import { Button } from '../../../components/common/Button'

export function AdminAuditPage() {
  const [page, setPage] = useState(1)
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: ['admin', 'audit', page],
    queryFn: async () => {
      const result = await realAdminApi.listAudit({ page, pageSize: 20 })
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    retry: false,
  })
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-h3 font-semibold tracking-tight text-sky-900"><ScrollText size={24} />审计日志</h1>
        <p className="mt-2 text-sm text-slate-500">查看系统已记录的后台操作。此处不显示改动前后的原始数据。</p>
      </div>
      <Button variant="outline" size="sm" disabled={isFetching} onClick={() => { void refetch() }} leftIcon={<RefreshCw size={14} />}>刷新</Button>
    </div>
    {isPending ? <div role="status" className="rounded-xl border border-sky-100 bg-white py-16 text-center text-sm text-slate-500">正在加载审计日志…</div>
      : error ? <div role="alert" className="rounded-xl border border-red-100 bg-white p-8 text-center">
        <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
        <p className="text-sm text-red-700">{error instanceof Error ? error.message : '审计日志加载失败'}</p>
        <Button className="mt-4" variant="outline" size="sm" onClick={() => { void refetch() }}>重试</Button>
      </div>
      : data && <div className="overflow-hidden rounded-xl border border-sky-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">后台操作审计列表</caption>
            <thead className="border-b border-sky-100 bg-sky-50/60 text-slate-600"><tr>
              {['时间', '操作者', '操作', '目标'].map(label => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {data.items.map(item => <tr key={item.id}>
                <td className="whitespace-nowrap px-4 py-3"><time dateTime={item.at}>{new Date(item.at).toLocaleString('zh-CN')}</time></td>
                <td className="max-w-48 break-all px-4 py-3">{item.actor === 'system' ? '系统' : item.actor}</td>
                <td className="break-all px-4 py-3">{item.action}</td>
                <td className="max-w-64 break-all px-4 py-3">{item.target}</td>
              </tr>)}
              {!data.items.length && <tr><td colSpan={4} className="py-16 text-center text-slate-500">暂无已记录的后台操作</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-100 px-4 py-3 text-sm text-slate-600">
          <span role="status">共 {data.total} 条记录 · 第 {data.page} / {pages} 页</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || isFetching} onClick={() => setPage(value => value - 1)}>上一页</Button>
            <Button size="sm" variant="outline" disabled={page >= pages || page >= 10000 || isFetching} onClick={() => setPage(value => value + 1)}>下一页</Button>
          </div>
        </div>
      </div>}
  </div>
}
