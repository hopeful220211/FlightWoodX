import { useRef, useEffect, useState } from 'react'
import { SkyBackground } from './SkyBackground'

async function initCamera(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null

  try {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
    const isTablet = /iPad|Android.*Tablet/i.test(navigator.userAgent)

    const resolution = isMobile && !isTablet
      ? { width: { ideal: 1280 }, height: { ideal: 720 } }
      : { width: { ideal: 1920 }, height: { ideal: 1080 } }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        ...resolution,
      },
      audio: false,
    })
    return stream
  } catch (err) {
    if ((err as DOMException).name === 'NotAllowedError') return null
    console.warn('[ARBackground] Camera error:', err)
    return null
  }
}

export function ARBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [useFallback, setUseFallback] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null

    initCamera().then(s => {
      if (s && videoRef.current) {
        stream = s
        videoRef.current.srcObject = s
        videoRef.current.play().catch(() => setUseFallback(true))
      } else {
        setUseFallback(true)
      }
    })

    return () => {
      stream?.getTracks().forEach(t => t.stop())
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [])

  if (useFallback) return <SkyBackground />

  return (
    <video
      ref={videoRef}
      className="fixed inset-0 w-full h-full object-cover -z-10"
      playsInline
      muted
    />
  )
}
