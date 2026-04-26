import { useRef, useState, useCallback, useEffect } from 'react'

export interface JoystickValue {
  x: number // -1 to 1
  y: number // -1 to 1
}

interface VirtualJoystickProps {
  onChange: (value: JoystickValue) => void
  size?: number
  thumbSize?: number
}

export function VirtualJoystick({ onChange, size = 120, thumbSize = 48 }: VirtualJoystickProps) {
  const ringRef = useRef<HTMLDivElement>(null)
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 })
  const activeIdRef = useRef<number | null>(null)
  const maxRadius = size / 2

  const processPosition = useCallback((clientX: number, clientY: number) => {
    if (!ringRef.current) return

    const rect = ringRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const dx = clientX - centerX
    const dy = clientY - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    const limited = Math.min(distance, maxRadius)
    const angle = Math.atan2(dy, dx)
    const clampedX = Math.cos(angle) * limited
    const clampedY = Math.sin(angle) * limited

    setThumbPos({ x: clampedX, y: clampedY })
    onChange({
      x: clampedX / maxRadius,
      y: -clampedY / maxRadius, // Y inverted: screen down = logic up
    })
  }, [maxRadius, onChange])

  const release = useCallback(() => {
    activeIdRef.current = null
    setThumbPos({ x: 0, y: 0 })
    onChange({ x: 0, y: 0 })
  }, [onChange])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.changedTouches[0]
    activeIdRef.current = touch.identifier
    processPosition(touch.clientX, touch.clientY)
  }, [processPosition])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeIdRef.current) {
        processPosition(touch.clientX, touch.clientY)
        break
      }
    }
  }, [processPosition])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeIdRef.current) {
        release()
        break
      }
    }
  }, [release])

  // Mouse handlers (desktop fallback)
  const [mouseDown, setMouseDown] = useState(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setMouseDown(true)
    processPosition(e.clientX, e.clientY)
  }, [processPosition])

  useEffect(() => {
    if (!mouseDown) return

    const handleMove = (e: MouseEvent) => processPosition(e.clientX, e.clientY)
    const handleUp = () => { setMouseDown(false); release() }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [mouseDown, processPosition, release])

  return (
    <div
      ref={ringRef}
      className="relative rounded-full border border-white/20 bg-white/10 backdrop-blur-sm"
      style={{ width: size, height: size, touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      {/* Thumb */}
      <div
        className="absolute rounded-full bg-wood-500 shadow-lg"
        style={{
          width: thumbSize,
          height: thumbSize,
          left: size / 2 - thumbSize / 2 + thumbPos.x,
          top: size / 2 - thumbSize / 2 + thumbPos.y,
          transition: activeIdRef.current !== null || mouseDown ? 'none' : 'left 200ms ease-out, top 200ms ease-out',
        }}
      />
    </div>
  )
}
