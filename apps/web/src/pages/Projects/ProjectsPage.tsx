import { useNavigate } from 'react-router-dom'
import { Plus, Rocket, FolderOpen, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { PageContainer } from '../../components/layout/PageContainer'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/common/Button'
import { Card } from '../../components/common/Card'
import { useProjects, useCreateProject, useDeleteProject } from '../../hooks/useProjects'
import { useToast } from '../../components/common/Toast'

export function ProjectsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { data: projects, isLoading, error } = useProjects()
  const createMutation = useCreateProject()
  const deleteMutation = useDeleteProject()

  const handleCreate = async () => {
    try {
      const p = await createMutation.mutateAsync('我的新项目')
      toast.push('success', '项目已创建')
      nav(`/projects/${p.id || (p as unknown as { _id: string })._id}`)
    } catch (e) {
      toast.push('error', e instanceof Error ? e.message : '创建失败')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`确定删除「${name}」？此操作不可撤销。`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.push('success', '已删除')
    } catch (e) {
      toast.push('error', e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <PageContainer className="py-8 space-y-6">
      <PageHeader
        title="我的项目"
        description="每个项目 = 一个设计 + 一份程序 + 一次试飞"
        actions={
          <Button onClick={handleCreate} loading={createMutation.isPending} leftIcon={<Plus size={16} />}>
            新建项目
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-sky-400" />
          <span className="ml-2 text-sm text-ink-400">加载中…</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-error/5 py-20 text-center">
          <AlertCircle size={36} className="text-error mb-3" />
          <p className="text-ink-600">{error instanceof Error ? error.message : '加载失败'}</p>
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const pid = p.id || (p as unknown as { _id: string })._id
            return (
              <Card key={pid} className="group relative cursor-pointer" onClick={() => nav(`/projects/${pid}`)}>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
                    <FolderOpen size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{p.name}</p>
                    <p className="text-xs text-ink-400 mt-0.5">
                      {p.visibility === 'public' ? '公开' : '私有'} · {new Date(p.updatedAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </div>
                {/* Delete button on hover */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(pid, p.name) }}
                  className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-ink-400 opacity-0 shadow transition group-hover:opacity-100 hover:text-error hover:bg-error/10"
                  aria-label="删除"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sky-200 py-20 text-center">
          <Rocket size={48} className="text-sky-300 mb-4" />
          <h3 className="text-lg font-semibold text-ink-900">还没有项目</h3>
          <p className="text-sm text-ink-400 mt-1 max-w-sm">
            创建你的第一个项目，从设计机身开始，然后用积木编程控制它，最后在模拟器里试飞！
          </p>
          <Button className="mt-6" onClick={handleCreate} loading={createMutation.isPending} leftIcon={<Plus size={16} />}>
            创建第一个项目
          </Button>
        </div>
      )}
    </PageContainer>
  )
}
