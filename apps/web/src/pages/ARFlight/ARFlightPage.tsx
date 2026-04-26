import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useDesignStore } from '../../stores/designStore'

export function ARFlightPage() {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-ink-900 text-white">
      <h1 className="font-display text-3xl font-semibold mb-4">AR 试飞</h1>
      <p className="text-ink-400 mb-2">
        {design.name ? `「${design.name}」` : '你的飞机'} · {design.parts.length} 个零件
      </p>
      <p className="text-ink-400 text-sm mb-8">摄像头 + 3D 飞机 + 双摇杆操控即将实现</p>
      <button
        onClick={() => navigate('/design')}
        className="inline-flex items-center gap-2 whitespace-nowrap px-6 py-3 text-sm font-medium text-ink-900 bg-paper-50 rounded-md hover:bg-paper-100 transition-colors"
      >
        <ArrowLeft size={16} />
        返回工作台
      </button>
    </div>
  )
}
