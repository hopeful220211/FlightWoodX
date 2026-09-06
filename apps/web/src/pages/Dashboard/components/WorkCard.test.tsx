// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DroneDesignSnapshotSchema } from '@fwx/parts-schema'
vi.mock('./WorkThumbnail', () => ({ WorkThumbnail: () => <button onClick={event => event.stopPropagation()}>重试</button> }))
import { WorkCard } from './WorkCard'

it('keeps preview opening accessible without nesting or activating it from retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const container = document.createElement('div')
  const root = createRoot(container)
  const onOpen = vi.fn()
  const design = DroneDesignSnapshotSchema.parse({ id: 'retry-cover', name: '测试作品', updatedAt: '2026-09-07T00:00:00.000Z', parts: [] })
  try {
    await act(async () => root.render(<WorkCard design={design} onOpen={onOpen} onRename={vi.fn()} onDelete={vi.fn()} onPublish={vi.fn()} />))
    expect(container.querySelector('button button')).toBeNull()
    expect(errors).not.toHaveBeenCalled()
    const retry = [...container.querySelectorAll('button')].find(button => button.textContent === '重试')!
    await act(async () => retry.click())
    expect(onOpen).not.toHaveBeenCalled()
    const open = container.querySelector<HTMLButtonElement>('button[aria-label="打开 测试作品"]')!
    await act(async () => open.click())
    expect(onOpen).toHaveBeenCalledWith(design)
  } finally {
    await act(async () => root.unmount())
    errors.mockRestore()
    vi.unstubAllGlobals()
  }
})
