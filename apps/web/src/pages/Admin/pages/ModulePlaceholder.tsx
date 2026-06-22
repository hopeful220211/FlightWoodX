import { Construction } from 'lucide-react'

/** 模块占位页（对应 Phase 1~4 逐步实现）。 */
export function ModulePlaceholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-8">
      <h1 className="text-h3 font-semibold tracking-tight text-sky-900">{title}</h1>
      <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-sky-200 bg-surface-white py-20 text-center">
        <Construction size={36} className="mb-4 text-sky-300" />
        <p className="text-title-sm font-medium text-sky-700">{title}模块开发中</p>
        <p className="mt-2 max-w-sm text-body text-sky-500">{desc}</p>
      </div>
    </div>
  )
}

export const AdminUsersPage = () => <ModulePlaceholder title="用户管理" desc="分页列表、筛选、详情、角色/认证/导入等操作将在 Phase 1 落地。" />
export const AdminCoursesPage = () => <ModulePlaceholder title="课程管理" desc="课程树、发布/回滚、课时与资产管理将在 Phase 2 落地。" />
export const AdminPartsPage = () => <ModulePlaceholder title="零件管理" desc="可拼装零件列表、审核/发布、采购 BOM 将在 Phase 3 落地。" />
export const AdminAuditPage = () => <ModulePlaceholder title="审计日志" desc="操作审计的分页查询将在 Phase 4 落地。" />
