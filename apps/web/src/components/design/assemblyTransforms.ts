import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import type { PartInstance } from '../../types/design'

const matrixFor = (part: PartInstance) => new Matrix4().compose(
  new Vector3(...part.position),
  new Quaternion().setFromEuler(new Euler(...part.rotation)),
  new Vector3(...(part.scale ?? [1, 1, 1])),
)

/** 移动/翻转一个已连接组件时，所有依附子件保持相同相对变换。 */
export function transformPartTree(parts: PartInstance[], instanceId: string, updates: Partial<PartInstance>): PartInstance[] {
  const original = parts.find(part => part.instanceId === instanceId)
  if (!original) return parts
  const updated = { ...original, ...updates, instanceId }
  const delta = matrixFor(updated).multiply(matrixFor(original).invert())
  const descendants = new Set([instanceId])
  let changed = true
  while (changed) {
    changed = false
    for (const part of parts) {
      if (part.attachedTo && descendants.has(part.attachedTo.parentInstanceId) && !descendants.has(part.instanceId)) {
        descendants.add(part.instanceId)
        changed = true
      }
    }
  }
  return parts.map(part => {
    if (part.instanceId === instanceId) return updated
    if (!descendants.has(part.instanceId)) return part
    const position = new Vector3()
    const rotation = new Quaternion()
    const scale = new Vector3()
    delta.clone().multiply(matrixFor(part)).decompose(position, rotation, scale)
    const euler = new Euler().setFromQuaternion(rotation)
    return { ...part, position: position.toArray(), rotation: [euler.x, euler.y, euler.z], scale: scale.toArray() } satisfies PartInstance
  })
}
