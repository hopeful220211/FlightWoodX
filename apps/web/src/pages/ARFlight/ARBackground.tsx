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
    let cancelled = false
    const video = videoRef.current

    initCamera().then(s => {
      if (cancelled) { s?.getTracks().forEach(track => track.stop()); return }
      if (s && video) {
        stream = s
        video.srcObject = s
        video.play().catch(() => {
          s.getTracks().forEach(track => track.stop())
          if (!cancelled) setUseFallback(true)
        })
      } else {
        setUseFallback(true)
      }
    })

    return () => {
      cancelled = true
      stream?.getTracks().forEach(t => t.stop())
      if (video) {
        video.srcObject = null
      }
    }
  }, [])

  if (useFallback) return <><SkyBackground /><p role="status" className="fixed top-20 inset-x-4 z-20 text-center text-xs text-white">摄像头不可用，已切换为虚拟背景；当前为视觉仿真。</p></>

  return (
    <video
      ref={videoRef}
      className="fixed inset-0 w-full h-full object-cover -z-10"
      playsInline
      muted
    />
  )
}
