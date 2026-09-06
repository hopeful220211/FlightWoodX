import { describe, expect, it } from 'vitest'
import { UserPartSchema } from '@fwx/parts-schema'
import { DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { makeCustomInstance, resolveCustomPart, buildCustomGeometry } from './customAssembly'

const record = UserPartSchema.parse({
  id: '507f1f77bcf86cd799439011', ownerId: 'owner-a', name: '我的轮廓', category: 'deco',
  geometry: { contour: 'M0 0 L40 0 L40 20 L0 20 Z', holes: ['M10 5 L10 15 L20 15 L20 5 Z'], thicknessMm: 2, bboxMm: { w: 40, h: 20 } },
  manufacturability: { closed: true, minFeatureMm: 0, withinBoard: true, passed: false },
  flightImpact: { massG: 1.2 }, createdAt: '2026-09-07T00:00:00.000Z', updatedAt: '2026-09-07T00:00:00.000Z',
})

describe('自制件来源与运行时几何', () => {
  it('preserves the original revision without copying geometry or inventing connectors', () => {
    const inst = makeCustomInstance(record, 'owner-a')
    expect(inst.source).toEqual({ kind: 'custom', id: record.id, version: 1, updatedAt: record.updatedAt })
    expect(inst.category).toBe('joint')
    expect(inst).not.toHaveProperty('geometry')
    expect(inst).not.toHaveProperty('activeConnectorId')
    expect(inst.attachedTo).toBeNull()
    expect(resolveCustomPart(record, inst, 'owner-a').status).toBe('draft')
  })

  it('fails closed for another owner, changed revision, mismatched id/category and missing source', () => {
    const inst = { ...makeCustomInstance(record, 'owner-a'), instanceId: 'a' }
    expect(() => makeCustomInstance(record, 'owner-b')).toThrow(/登录账号/)
    for (const changed of [
      { ...record, ownerId: 'owner-b' }, { ...record, id: '507f1f77bcf86cd799439012' },
      { ...record, version: 2 }, { ...record, updatedAt: '2026-09-07T00:00:01.000Z' },
      { ...record, category: 'landing' },
    ]) expect(() => resolveCustomPart(changed, inst, 'owner-a')).toThrow()
    expect(() => resolveCustomPart(record, { ...inst, source: undefined }, 'owner-a')).toThrow()
    expect(() => resolveCustomPart(undefined, inst, 'owner-a')).toThrow()
  })

  it('renders millimetres as metres with the real 2mm thickness and open holes', () => {
    const geometry = buildCustomGeometry(record.geometry)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    expect(box.max.x - box.min.x).toBeCloseTo(0.04)
    expect(box.max.y - box.min.y).toBeCloseTo(0.002)
    expect(box.max.z - box.min.z).toBeCloseTo(0.02)
    const shape = geometry.parameters.shapes
    expect(Array.isArray(shape) ? shape[0]!.holes : shape.holes).toHaveLength(1)
    const material = new MeshBasicMaterial({ side: DoubleSide })
    const mesh = new Mesh(geometry, material)
    expect(new Raycaster(new Vector3(-0.005, 0.01, 0), new Vector3(0, -1, 0)).intersectObject(mesh)).toHaveLength(0)
    expect(new Raycaster(new Vector3(0.015, 0.01, 0), new Vector3(0, -1, 0)).intersectObject(mesh).length).toBeGreaterThan(0)
    material.dispose()
    geometry.dispose()
  })

  it('rejects unsupported, self-intersecting and excessive geometry instead of approximating it', () => {
    for (const contour of ['M0 0 C10 0 20 10 30 20 Z', 'M0 0 L20 20 L0 20 L20 0 Z', `M0 0 ${'L10 10 '.repeat(2001)}Z`]) {
      expect(() => buildCustomGeometry({ ...record.geometry, contour })).toThrow()
    }
  })
})
