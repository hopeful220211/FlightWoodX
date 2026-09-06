import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as THREE from 'three'
import { expect, it, vi } from 'vitest'
import type { Design } from '../../types/design'

vi.mock('@react-three/fiber', () => ({ Canvas: () => null, useThree: () => ({ camera: new THREE.PerspectiveCamera() }), useFrame: () => undefined }))
vi.mock('@react-three/drei', () => ({ Html: ({ children }: { children: React.ReactNode }) => children, useGLTF: () => ({ scene: new THREE.Group() }) }))
vi.mock('../../features/partStudio/CustomAssemblyPart', () => ({
  CustomAssemblyPart: ({ instance }: { instance: Design['parts'][number] }) => <div data-custom-source={instance.source?.id} />,
}))
import { DesignScene } from './DesignPreview3D'

const design: Design = {
  schemaVersion: 1, id: 'custom-preview', name: 'Custom', buildMode: 'free', currentStep: 'REVIEW',
  stepReached: 0, updatedAt: '2026-09-07T00:00:00.000Z',
  parts: [{ instanceId: 'custom', partId: 'custom_507f1f77bcf86cd799439011', category: 'landing', position: [0, 0, 0], rotation: [0, 0, 0],
    source: { kind: 'custom', id: '507f1f77bcf86cd799439011', version: 1, updatedAt: '2026-09-07T00:00:00.000Z' } }],
}

function renderScene(value: Design) {
  return renderToStaticMarkup(createElement(QueryClientProvider, { client: new QueryClient() }, createElement(DesignScene, { design: value })))
}

it('routes a custom-only design through the authenticated custom renderer instead of dropping it', () => {
  expect(renderScene(design)).toContain('data-custom-source="507f1f77bcf86cd799439011"')
})

it('fails rather than producing a successful partial cover for an unknown official part', () => {
  expect(() => renderScene({ ...design, parts: [{ ...design.parts[0], source: undefined, partId: 'missing-official-part' }] })).toThrow(/零件/)
})
