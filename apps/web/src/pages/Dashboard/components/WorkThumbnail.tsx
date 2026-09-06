import { useCallback, useEffect, useRef, useState } from 'react'
import { Plane } from 'lucide-react'
import { useGLTF } from '@react-three/drei'
import { DesignPreview3D } from '../../../components/design/DesignPreview3D'
import type { Design } from '../../../types/design'
import { coverKeyOf } from './coverKey'
import { useAuthStore } from '../../../stores/authStore'
import { partsData } from '../../../data/parts'

/**
 * 作品卡缩略图：真实 3D 预览，但「懒加载 + 抓帧定格」以保护 WebGL Context。
 *
 * 背景（§2.4 已知白屏根因）：每个 3D 画布各占一个 WebGL Context，浏览器约 16 个上限，
 * 作品一多、卡片各自开画布就会溢出白屏。这里的做法：
 *  1. 卡片进入视口才申请一个「画布名额」（同时存活的画布上限 MAX_LIVE）；
 *  2. 画布渲染稳定后抓一帧 webp 当封面，存进内存缓存并卸载画布、归还名额；
 *  3. 之后这张卡只显示静态封面图，不再占用 Context。
 *
 * 状态在「设计被改」时通过父层用 `coverKeyOf` 作 React key 重新挂载来重置（避免在渲染期/副作用里
 * 写 ref 或同步 setState）。没有零件的设计不开画布，直接显示天空蓝占位（不用糊图、不用土色）。
 */

/** 已抓取的封面（内存缓存；键含 updatedAt + 零件数 → 设计一改自动失效重抓）。 */
const coverCache = new Map<string, string>()

/** 同时存活的 3D 画布上限。工作台只有缩略图用画布，留足余量取 4。 */
const MAX_LIVE = 4
let liveCount = 0
const waiters: Array<() => void> = []

function acquireSlot(): boolean {
  if (liveCount < MAX_LIVE) {
    liveCount += 1
    return true
  }
  return false
}

function releaseSlot(): void {
  liveCount = Math.max(0, liveCount - 1)
  const next = waiters.shift()
  if (next) next()
}

/** 排队等一个名额；返回「退出队列」函数（卡片卸载时调用）。 */
function queueForSlot(cb: () => void): () => void {
  waiters.push(cb)
  return () => {
    const i = waiters.indexOf(cb)
    if (i >= 0) waiters.splice(i, 1)
  }
}

export interface WorkThumbnailProps {
  design: Design
  /** 抓到 3D 定格图时回调（同一份 Blob 复用为服务器封面，避免为封面再开一次画布）。 */
  onCapture?: (blob: Blob) => void
}

export function WorkThumbnail({ design, onCapture }: WorkThumbnailProps) {
  const ownerId = useAuthStore(state => state.user?.id)
  const cacheKey = `${ownerId ?? 'guest'}:${coverKeyOf(design)}`
  return <ScopedWorkThumbnail key={cacheKey} design={design} onCapture={onCapture} cacheKey={cacheKey} />
}

function ScopedWorkThumbnail({ design, onCapture, cacheKey }: WorkThumbnailProps & { cacheKey: string }) {
  const hasParts = design.parts.length > 0

  const [cover, setCover] = useState<string | null>(() => coverCache.get(cacheKey) ?? null)
  const [live, setLive] = useState(false)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const holdsSlotRef = useRef(false)

  // 进入视口 → 抢画布名额 → 抓封面。整套生命周期与名额归还都收口在这一个 effect 内。
  // 不在 effect 体内同步 setState：setLive 只在「观察器回调 / 等到名额回调」这类异步事件里触发。
  useEffect(() => {
    if (!hasParts || coverCache.has(cacheKey)) return
    const el = containerRef.current
    if (!el) return

    let started = false
    let visible = false
    let dequeue: (() => void) | null = null

    const start = () => {
      if (started || coverCache.has(cacheKey)) return
      if (acquireSlot()) {
        started = true
        holdsSlotRef.current = true
        setLive(true)
      } else if (!dequeue) {
        dequeue = queueForSlot(() => {
          dequeue = null
          if (visible && !started && !coverCache.has(cacheKey)) start()
        })
      }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) start()
      },
      { rootMargin: '200px' },
    )
    io.observe(el)

    return () => {
      io.disconnect()
      if (dequeue) dequeue()
      if (holdsSlotRef.current) {
        holdsSlotRef.current = false
        releaseSlot()
      }
    }
  }, [cacheKey, hasParts, attempt])

  // 抓到封面：缓存 + 定格成静态图 + 卸载画布、归还名额；同时把 Blob 交给上层（存服务器封面）。
  const handleSnapshot = useCallback(
    (blob: Blob) => {
      if (!coverCache.has(cacheKey)) {
        coverCache.set(cacheKey, URL.createObjectURL(blob))
      }
      setCover(coverCache.get(cacheKey) ?? null)
      setLive(false)
      if (holdsSlotRef.current) {
        holdsSlotRef.current = false
        releaseSlot()
      }
      onCapture?.(blob)
    },
    [cacheKey, onCapture],
  )

  const handleSnapshotError = useCallback(() => {
    setFailed(true)
    setLive(false)
    if (holdsSlotRef.current) {
      holdsSlotRef.current = false
      releaseSlot()
    }
  }, [])

  let inner
  if (!hasParts) {
    inner = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-sky-gradient text-sky-400">
        <Plane className="h-9 w-9" strokeWidth={1.5} aria-hidden />
        <span className="text-xs font-medium text-sky-500">还没放零件</span>
      </div>
    )
  } else if (cover) {
    inner = (
      <img
        src={cover}
        alt={`${design.name} 预览`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    )
  } else if (failed) {
    inner = (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <span role="status">加载失败</span>
        <button type="button" className="relative z-20 text-sky-700 underline" onClick={(event) => {
          event.stopPropagation()
          // Suspense retains rejected GLB loads across remounts. Retry only
          // this work's registered official URLs, never the global cache.
          const modelUrls = new Set(design.parts.flatMap(instance => {
            if (instance.source) return []
            const part = partsData.find(value => value.id === instance.partId)
            return part ? [part.modelUrl] : []
          }))
          for (const url of modelUrls) useGLTF.clear(url)
          setFailed(false)
          setAttempt((value) => value + 1)
        }}>重试</button>
      </div>
    )
  } else if (live) {
    inner = <DesignPreview3D design={design} fill onSnapshot={handleSnapshot} onSnapshotError={handleSnapshotError} />
  } else {
    // 已可见但还在排队 / 尚未进入视口：天空蓝呼吸占位，不开画布。
    inner = <div className="h-full w-full animate-pulse bg-sky-gradient" />
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      {inner}
    </div>
  )
}
