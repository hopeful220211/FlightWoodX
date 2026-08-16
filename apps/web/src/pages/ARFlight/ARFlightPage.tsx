import { useRef, useCallback, useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useDesignStore } from '../../stores/designStore'
import { ARBackground } from './ARBackground'
import { DroneScene } from './DroneScene'
import { JoystickOverlay } from './JoystickOverlay'
import { HUD } from './HUD'
import type { ControlInput } from './JoystickOverlay'
import type { FlightInput } from './flightPhysics'

export function ARFlightPage() {
  const { designId } = useParams<{ designId: string }>()
  const navigate = useNavigate()
  const design = useDesignStore(s => s.designs.find(d => d.id === designId))
  const flightInputRef = useRef<FlightInput>({ leftX: 0, leftY: 0, rightX: 0, rightY: 0 })
  const [altitude, setAltitude] = useState(0.5)
  const altitudeRef = useRef(0.5)

  // Poll altitude from physics state (updated by FlightController via ref)
  useEffect(() => {
    const interval = setInterval(() => {
      setAltitude(altitudeRef.current)
    }, 200)
    return () => clearInterval(interval)
  }, [])

  const handleInput = useCallback((input: ControlInput) => {
    flightInputRef.current = {
      leftX: input.leftJoystick.x,
      leftY: input.leftJoystick.y,
      rightX: input.rightJoystick.x,
      rightY: input.rightJoystick.y,
    }
  }, [])

  const handleAltitudeChange = useCallback((nextAltitude: number) => {
    altitudeRef.current = nextAltitude
  }, [])

  const handleFirstTouch = useCallback(() => {
    // Hint dismissed by HUD internally
  }, [])

  // Request fullscreen on mount (best-effort)
  useEffect(() => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {})
    } else if ((elem as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
      (elem as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen().catch(() => {})
    }
    return () => {
      document.exitFullscreen?.().catch(() => {})
    }
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
      <ARBackground />
      <DroneScene parts={design.parts} inputRef={flightInputRef} onAltitudeChange={handleAltitudeChange} />

      <div className="fixed inset-0 z-20 pointer-events-none">
        <HUD
          altitude={altitude}
          onExit={() => navigate('/design')}
          onFirstTouch={handleFirstTouch}
        />
        <JoystickOverlay onInput={handleInput} onFirstTouch={handleFirstTouch} />
      </div>
    </div>
  )
}
