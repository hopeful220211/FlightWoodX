import { CustomPartSourceSchema, UserPartSchema, type DesignPartInstance, type UserPartGeometry } from '@fwx/parts-schema'
import { svgPathToPolyline, validatePart, type Part2D } from '@fwx/geometry'
import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three'
import { ensureWinding } from './geometry/winding'

function parseGeometry(geometry: UserPartGeometry): Part2D {
  const contours = [geometry.contour, ...geometry.holes].map(svgPathToPolyline)
  if (contours.some(points => !points) || contours.reduce((sum, points) => sum + (points?.length ?? 0), 0) > 2000) {
    throw new Error('零件轮廓无法显示或超过 2000 个顶点；来源引用仍保留')
  }
  const loops = contours as NonNullable<(typeof contours)[number]>[]
  const points = loops.flat()
  if (points.some(point => point.some(value => !Number.isFinite(value) || Math.abs(value) > 1_000_000))) throw new Error('零件轮廓坐标超出可显示范围')
  const x = points.map(point => point[0]), y = points.map(point => point[1])
  if (Math.max(...x) - Math.min(...x) > 2000 || Math.max(...y) - Math.min(...y) > 2000) throw new Error('零件实际轮廓超出 2000 mm 范围')
  const part = { contour: { points: loops[0]! }, holes: loops.slice(1).map(points => ({ points })) }
  if (!validatePart(part).ok) throw new Error('零件轮廓无效，不能生成显示模型；来源引用仍保留')
  return part
}

/** Authenticated source data is authoritative. Never promote a new revision to an existing reference. */
export function resolveCustomPart(data: unknown, instance: Pick<DesignPartInstance, 'partId' | 'category' | 'source'>, ownerId: string | undefined) {
  const part = UserPartSchema.parse(data)
  const source = CustomPartSourceSchema.parse(instance.source)
  if (!ownerId || part.ownerId !== ownerId) throw new Error('零件不属于当前登录账号，来源引用仍保留')
  if (part.id !== source.id || instance.partId !== `custom_${source.id}` || part.version !== source.version || part.updatedAt !== source.updatedAt) {
    throw new Error('原零件已修改，无法恢复该版本；来源引用仍保留，请重新选择零件')
  }
  if ((part.category === 'deco' ? 'joint' : part.category) !== instance.category) throw new Error('零件来源类别不一致，来源引用仍保留')
  parseGeometry(part.geometry)
  return part
}

export function makeCustomInstance(data: unknown, ownerId: string | undefined): Omit<DesignPartInstance, 'instanceId'> {
  const part = UserPartSchema.parse(data)
  const instance = {
    partId: `custom_${part.id}`, category: part.category === 'deco' ? 'joint' as const : part.category,
    position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number], attachedTo: null,
    source: CustomPartSourceSchema.parse({ kind: 'custom', id: part.id, version: part.version, updatedAt: part.updatedAt }),
  }
  resolveCustomPart(part, instance, ownerId)
  return instance
}

/** Geometry stays transient. Millimetres become metres; 2mm thickness and holes are retained. */
export function buildCustomGeometry(geometry: UserPartGeometry): ExtrudeGeometry {
  const part = parseGeometry(geometry)
  const toVectors = (points: Part2D['contour']['points'], ccw: boolean) => ensureWinding(points, ccw).map(([x, y]) => new Vector2(x / 1000, -y / 1000))
  const shape = new Shape(toVectors(part.contour.points, true))
  shape.holes = (part.holes ?? []).map(hole => new Path(toVectors(hole.points, false)))
  const mesh = new ExtrudeGeometry(shape, { depth: geometry.thicknessMm / 1000, bevelEnabled: false, steps: 1, curveSegments: 1 })
  mesh.center()
  mesh.rotateX(-Math.PI / 2)
  return mesh
}
