// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AwardsSection } from './AwardsSection'
import { HeroSection } from './HeroSection'

beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true }))))
afterEach(() => vi.unstubAllGlobals())

it('shows only the three awards confirmed by the owner', () => {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(<AwardsSection />)

  expect(Array.from(container.querySelectorAll('h3'), node => node.textContent))
    .toEqual(['Red Dot', 'iF Design', 'IDEA'])
  expect(Array.from(container.querySelectorAll('img'), node => node.alt))
    .toEqual(['Red Dot', 'iF Design', 'IDEA'])
  expect(container.textContent).toContain('红点、iF、IDEA，下面这三个都在手上。')
  expect(container.innerHTML).not.toMatch(/g-?mark|四个/i)
})

it('keeps the hero award summary and count consistent with those three awards', () => {
  const container = document.createElement('div')
  container.innerHTML = renderToStaticMarkup(<MemoryRouter><HeroSection /></MemoryRouter>)

  expect(container.querySelector('button')?.textContent).toBe('Red Dot 2024 · iF 2026 · IDEA')
  expect(container.textContent).toContain('3 项全球设计大奖')
  expect(container.textContent).not.toMatch(/g-?mark|10\+/i)
})
