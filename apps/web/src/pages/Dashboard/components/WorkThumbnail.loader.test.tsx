// @vitest-environment jsdom
import { act, Component, Suspense, useEffect, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { useGLTF } from '@react-three/drei'
import { expect, it, vi } from 'vitest'
import { DroneDesignSnapshotSchema } from '@fwx/parts-schema'
import { partsData } from '../../../data/parts'

const loading = vi.hoisted(() => ({ url: '', requests: 0 }))
let restoreTransport: (() => void) | undefined

function LoadedPreview({ onSnapshot }: { onSnapshot: (blob: Blob) => void }) {
  useGLTF(loading.url, false, false, loader => {
    // Keep the real useGLTF/useLoader Suspense cache. Only replace the actual
    // network transport, so remounting without clear() still rethrows its error.
    if (!restoreTransport) {
      const original = loader.load
      restoreTransport = () => { loader.load = original }
    }
    loader.load = (_url, onLoad, _onProgress, onError) => {
      loading.requests++
      queueMicrotask(() => {
        if (loading.requests === 1) onError?.(new ErrorEvent('error', { message: '503 temporary model failure' }))
        else loader.parse('{"asset":{"version":"2.0"},"scenes":[{"nodes":[]}],"scene":0}', '', onLoad, onError)
      })
    }
  })
  useEffect(() => onSnapshot(new Blob(['rendered cover'])), [onSnapshot])
  return null
}

class ModelFailure extends Component<{ children: ReactNode; onError?: (error: Error) => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { this.props.onError?.(error) }
  render() { return this.state.failed ? null : this.props.children }
}

vi.mock('../../../components/design/DesignPreview3D', () => ({
  DesignPreview3D: ({ onSnapshot, onSnapshotError }: { onSnapshot: (blob: Blob) => void; onSnapshotError?: (error: Error) => void }) => (
    <ModelFailure onError={onSnapshotError}><Suspense fallback={null}><LoadedPreview onSnapshot={onSnapshot} /></Suspense></ModelFailure>
  ),
}))
import { WorkThumbnail } from './WorkThumbnail'

it('retry reloads the failed official model and clears only URLs referenced by this work', async () => {
  const official = partsData[0]!
  loading.url = official.modelUrl
  loading.requests = 0
  useGLTF.clear(loading.url)
  const clear = vi.spyOn(useGLTF, 'clear')
  const onCapture = vi.fn()
  const caught: unknown[] = []
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('IntersectionObserver', class {
    callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) { this.callback = callback }
    observe() { queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)) }
    disconnect() {}
  })
  vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:recovered-cover' } })
  const container = document.createElement('div')
  const root = createRoot(container, { onCaughtError: error => caught.push(error) })
  const design = DroneDesignSnapshotSchema.parse({
    id: 'loader-retry', name: 'Retry', updatedAt: '2026-09-07T00:00:00.000Z',
    parts: [1, 2].map(index => ({ instanceId: `part-${index}`, partId: official.id, category: official.category, position: [0, 0, 0], rotation: [0, 0, 0] })),
  })
  try {
    await act(async () => root.render(<WorkThumbnail design={design} onCapture={onCapture} />))
    expect(container.textContent).toContain('加载失败')
    expect(loading.requests).toBe(1)
    expect(onCapture).not.toHaveBeenCalled()
    const retry = [...container.querySelectorAll('button')].find(button => button.textContent === '重试')!
    await act(async () => retry.click())
    expect(loading.requests).toBe(2)
    expect(onCapture).toHaveBeenCalledOnce()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:recovered-cover')
    expect(clear.mock.calls).toEqual([[official.modelUrl]])
    expect(caught).toHaveLength(1)
  } finally {
    await act(async () => root.unmount())
    clear.mockRestore()
    useGLTF.clear(loading.url)
    restoreTransport?.()
    restoreTransport = undefined
    vi.unstubAllGlobals()
  }
})
