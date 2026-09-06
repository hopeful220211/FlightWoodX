// @vitest-environment jsdom
import { act, createElement, type ComponentType } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Design } from '../../../types/design'

vi.mock('../../../components/design/DesignPreview3D', () => ({
  DesignPreview3D: ({ onSnapshot, onSnapshotError }: { onSnapshot: (blob: Blob) => void; onSnapshotError?: (error: Error) => void }) => (
    <div data-testid="live-preview">
      <button onClick={() => onSnapshotError?.(new Error('Image failed'))}>fail image</button>
      <button onClick={() => onSnapshot(new Blob(['valid cover']))}>capture</button>
    </div>
  ),
}))

let root: Root
let container: HTMLDivElement
let WorkThumbnail: ComponentType<{ design: Design; onCapture?: (blob: Blob) => void }>
const design: Design = {
  schemaVersion: 1,
  id: 'thumbnail-readiness', name: 'Preview', stepReached: 0, updatedAt: '2026-09-07T00:00:00.000Z',
  buildMode: 'free', currentStep: 'REVIEW',
  parts: [{ instanceId: 'base', partId: 'official', category: 'mainboard', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }],
}

beforeEach(async () => {
  vi.resetModules()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('IntersectionObserver', class {
    private callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) { this.callback = callback }
    observe() { queueMicrotask(() => this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)) }
    disconnect() {}
  })
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL() { return 'blob:valid-cover' }
  })
  container = document.createElement('div')
  root = createRoot(container)
  WorkThumbnail = (await import('./WorkThumbnail')).WorkThumbnail
})

afterEach(async () => {
  await act(async () => root.unmount())
  vi.unstubAllGlobals()
})

it('does not cache or upload a failed preview and can retry the same design', async () => {
  const onCapture = vi.fn()
  await act(async () => root.render(createElement(WorkThumbnail, { design, onCapture })))
  const fail = [...container.querySelectorAll('button')].find((button) => button.textContent === 'fail image')!
  await act(async () => fail.click())
  expect(onCapture).not.toHaveBeenCalled()
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('[data-testid="live-preview"]')).toBeNull()
  expect(container.textContent).toContain('加载失败')

  const retry = [...container.querySelectorAll('button')].find((button) => button.textContent === '重试')!
  await act(async () => retry.click())
  expect(container.querySelector('[data-testid="live-preview"]')).not.toBeNull()
  const capture = [...container.querySelectorAll('button')].find((button) => button.textContent === 'capture')!
  await act(async () => capture.click())
  expect(onCapture).toHaveBeenCalledOnce()
  expect(container.querySelector('img')?.getAttribute('src')).toBe('blob:valid-cover')
  expect(container.querySelector('[data-testid="live-preview"]')).toBeNull()
})

it('does not reuse another account\'s cached cover for the same local design id', async () => {
  const { useAuthStore } = await import('../../../stores/authStore')
  useAuthStore.setState({ token: 'account-a-test', user: { id: 'account-a', username: 'A', role: 'student' } })
  await act(async () => root.render(createElement(WorkThumbnail, { design })))
  const capture = [...container.querySelectorAll('button')].find((button) => button.textContent === 'capture')!
  await act(async () => capture.click())
  expect(container.querySelector('img')).not.toBeNull()
  await act(async () => useAuthStore.setState({ token: 'account-b-test', user: { id: 'account-b', username: 'B', role: 'student' } }))
  expect(container.querySelector('img')).toBeNull()
  expect(container.querySelector('[data-testid="live-preview"]')).not.toBeNull()
})
