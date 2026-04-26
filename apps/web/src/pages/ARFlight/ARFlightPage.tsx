import { useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useDesignStore } from '../../stores/designStore'
import { ARBackground } from './ARBackground'
import { DroneScene } from './DroneScene'
import { JoystickOverlay } from './JoystickOverlay'
import type { ControlInput } from './JoystickOverlay'

export function ARFlightPage() {
  const { designId } = useParams<{ designId: string }>()
  const navigate = useNavigate()
  const design = useDesignStore(s => s.designs.find(d => d.id === designId))
  const inputRef = useRef<ControlInput>({
    leftJoystick: { x: 0, y: 0 },
    rightJoystick: { x: 0, y: 0 },
  })

  const handleInput = useCallback((input: ControlInput) => {
    inputRef.current = input
  }, [])

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

        {/* Dual joysticks */}
        <JoystickOverlay onInput={handleInput} />
      </div>
    </div>
  )
}
