import { useCallback, useRef } from 'react'
import { VirtualJoystick } from './VirtualJoystick'
import type { JoystickValue } from './VirtualJoystick'

export interface ControlInput {
  leftJoystick: JoystickValue
  rightJoystick: JoystickValue
}

interface JoystickOverlayProps {
  onInput: (input: ControlInput) => void
  onFirstTouch?: () => void
}

export function JoystickOverlay({ onInput, onFirstTouch }: JoystickOverlayProps) {
  const leftRef = useRef<JoystickValue>({ x: 0, y: 0 })
  const rightRef = useRef<JoystickValue>({ x: 0, y: 0 })
  const touchedRef = useRef(false)

  const emit = useCallback(() => {
    onInput({ leftJoystick: leftRef.current, rightJoystick: rightRef.current })
  }, [onInput])

  const handleLeft = useCallback((v: JoystickValue) => {
    leftRef.current = v
    if (!touchedRef.current && (v.x !== 0 || v.y !== 0)) {
      touchedRef.current = true
      onFirstTouch?.()
    }
    emit()
  }, [emit, onFirstTouch])

  const handleRight = useCallback((v: JoystickValue) => {
    rightRef.current = v
    if (!touchedRef.current && (v.x !== 0 || v.y !== 0)) {
      touchedRef.current = true
      onFirstTouch?.()
    }
    emit()
  }, [emit, onFirstTouch])

  return (
    <>
      {/* Left joystick: strafe + altitude */}
      <div className="pointer-events-auto absolute bottom-8 left-8">
        <VirtualJoystick onChange={handleLeft} />
      </div>

      {/* Right joystick: forward/back + yaw */}
      <div className="pointer-events-auto absolute bottom-8 right-8">
        <VirtualJoystick onChange={handleRight} />
      </div>
    </>
  )
}
