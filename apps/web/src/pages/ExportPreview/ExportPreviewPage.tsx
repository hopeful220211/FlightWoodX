import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDesignStore } from '../../stores/designStore'

export function ExportPreviewPage() {
  const { designId } = useParams<{ designId: string }>()
  const navigate = useNavigate()
  const design = useDesignStore(s => s.designs.find(d => d.id === designId))

  if (!design) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-paper-50">
        <p className="text-lg text-ink-600 mb-4">未找到该设计</p>
        <button
          onClick={() => navigate('/design')}
          className="inline-flex items-center gap-2 text-sm font-medium text-wood-500 hover:text-wood-600"
        >
          <ArrowLeft size={16} />
          返回设计工作台
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper-50">
      {/* Top nav */}
      <div className="sticky top-0 z-20 bg-paper-50/90 backdrop-blur-[12px] border-b border-ink-200/30">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/design')}
            className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900 transition-colors"
          >
            <ArrowLeft size={16} />
            返回工作台
          </button>
        </div>
      </div>

      {/* Placeholder content — will be replaced in PR 2 */}
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="text-center space-y-4">
          <h1 className="font-display text-4xl font-semibold text-ink-900">
            {design.name ? `「${design.name}」导出预览` : '导出预览'}
          </h1>
          <p className="text-ink-600">
            共 {design.parts.length} 个零件 · 创建于 {new Date(design.updatedAt).toLocaleDateString('zh-CN')}
          </p>
          <div className="mt-12 bg-paper-100 rounded-lg p-12 text-ink-400">
            <p className="text-lg">飞行检查报告、飞机参数、零件清单、制作准备</p>
            <p className="text-sm mt-2">即将在 PR 2 实现</p>
          </div>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('/design')}
              className="inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-medium text-ink-900 border border-ink-200 rounded-md hover:bg-paper-100 transition-colors"
            >
              返回继续修改
            </button>
            <button
              disabled
              className="inline-flex w-fit items-center gap-2 whitespace-nowrap px-6 py-3 text-sm font-medium text-white bg-wood-500 rounded-md opacity-50 cursor-not-allowed"
            >
              确认导出（PR 2）
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
