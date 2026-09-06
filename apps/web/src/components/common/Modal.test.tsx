// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  document.body.style.overflow = ''
  vi.unstubAllGlobals()
})

it('preserves input focus when a parent rerenders and Escape uses the latest handler', async () => {
  const previousClose = vi.fn()
  const nextClose = vi.fn()
  await act(async () => root.render(<Modal open title="Rename" onClose={previousClose}><input aria-label="Name" /></Modal>))
  const input = document.querySelector<HTMLInputElement>('input')!
  input.focus()
  await act(async () => root.render(<Modal open title="Rename" onClose={nextClose}><input aria-label="Name" /></Modal>))
  expect(document.activeElement).toBe(input)
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
  expect(nextClose).toHaveBeenCalledOnce()
  expect(previousClose).not.toHaveBeenCalled()
})

it('restores the previous focus and scroll state after closing', async () => {
  const opener = document.createElement('button')
  document.body.append(opener)
  opener.focus()
  document.body.style.overflow = 'auto'
  const onClose = vi.fn()
  await act(async () => root.render(<Modal open title="Delete" onClose={onClose}>Confirm</Modal>))
  expect(document.body.style.overflow).toBe('hidden')
  expect(document.activeElement?.getAttribute('role')).toBe('dialog')
  await act(async () => root.render(<Modal open={false} onClose={onClose}>Confirm</Modal>))
  expect(document.body.style.overflow).toBe('auto')
  expect(document.activeElement).toBe(opener)
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  opener.remove()
})
