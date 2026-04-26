import { useParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useDesignStore } from '../../stores/designStore'
import { ARBackground } from './ARBackground'
import { DroneScene } from './DroneScene'

export function ARFlightPage() {
  const { designId } = useParams<{ designId: string }>()
  const navigate = useNavigate()
  const design = useDesignStore(s => s.designs.find(d => d.id === designId))

  if (!design) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ink-900 text-white">
        <p className="text-lg mb-4">未找到该设计</p>
        <button
          onClick={() => navigate('/design')}
          className="text-sm text-wood-400 hover:text-wood-300"
        >
          返回工作台
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink-900" style={{ touchAction: 'none' }}>
      {/* Layer 1: Camera video or sky fallback */}
      <ARBackground />

      {/* Layer 2: 3D drone scene (transparent canvas) */}
      <DroneScene parts={design.parts} />

      {/* Layer 3: HUD overlay */}
      <div className="fixed inset-0 z-20 pointer-events-none">
        {/* Exit button — top right */}
        <button
          onClick={() => navigate('/design')}
          className="pointer-events-auto absolute top-6 right-6 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
          aria-label="退出 AR 试飞"
        >
          <X size={20} />
        </button>

        {/* Joystick placeholders — will be implemented in PR 3 */}
        <div className="pointer-events-auto absolute bottom-8 left-8 w-[120px] h-[120px] rounded-full border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-wood-500/60" />
        </div>
        <div className="pointer-events-auto absolute bottom-8 right-8 w-[120px] h-[120px] rounded-full border border-white/20 bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-wood-500/60" />
        </div>
      </div>
    </div>
  )
}
