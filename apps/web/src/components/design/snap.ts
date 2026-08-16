import * as THREE from 'three'

/**
 * 计算“把某个 plug 对齐到某个 socket”时，零件实例需要的世界位姿。
 *
 * 约定（来自 V2 文档）：
 * - 连接点的 -Y 轴指向“插入方向”
 * - 对齐时，让 plug 的朝向与 socket 的朝向一致（即它们的 -Y 方向重合）
 */
export function computeSnapTransform(params: {
  socketWorldPosition: THREE.Vector3
  socketWorldQuaternion: THREE.Quaternion
  plugLocalPosition: THREE.Vector3
  plugLocalQuaternion: THREE.Quaternion
}) {
  const { socketWorldPosition, socketWorldQuaternion, plugLocalPosition, plugLocalQuaternion } = params

  // 旋转：让 plugLocalQuaternion 旋到 socketWorldQuaternion
  const rotation = socketWorldQuaternion.clone().multiply(plugLocalQuaternion.clone().invert())

  // 位置：socketWorldPos - rotation * plugLocalPos
  const rotatedPlugPos = plugLocalPosition.clone().applyQuaternion(rotation)
  const position = socketWorldPosition.clone().sub(rotatedPlugPos)

  return { position, quaternion: rotation }
}

/**
 * Compute snap transform that guarantees:
 * 1. Plug -Y faces opposite to socket -Y (face to face insertion)
 * 2. Part stands upright (perpendicular to parent surface)
 *
 * Works for ALL models regardless of connector export convention.
 * Does NOT use computeSnapTransform (which only aligns same-direction).
 */
export function computePerpendicularSnap(params: {
  socketWorldPosition: THREE.Vector3
  socketWorldQuaternion: THREE.Quaternion
  plugLocalPosition: THREE.Vector3
  plugLocalQuaternion: THREE.Quaternion
}) {
  const { socketWorldPosition, socketWorldQuaternion, plugLocalPosition, plugLocalQuaternion } = params

  // Step 1: Rotation that makes plug's -Y OPPOSE socket's -Y
  // R_face = socketQuat × rotX180 × plugQuat⁻¹
  // This works because: R_face × plugQuat × (0,-1,0) = socketQuat × rotX180 × (0,-1,0) = socketQuat × (0,1,0) = -(socket -Y)
  const rotX180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
  const faceRotation = socketWorldQuaternion.clone()
    .multiply(rotX180)
    .multiply(plugLocalQuaternion.clone().invert())

  // Step 2: Stand upright — rotate 90° around socket's -Y world direction
  const socketNegY = new THREE.Vector3(0, -1, 0).applyQuaternion(socketWorldQuaternion)
  const standUp = new THREE.Quaternion().setFromAxisAngle(socketNegY, Math.PI / 2)

  // Final quaternion: stand up first (world space), then face (local)
  const quaternion = standUp.clone().multiply(faceRotation)

  // Position: socket pos - rotated plug offset
  const plugOffset = plugLocalPosition.clone().applyQuaternion(quaternion)
  const position = socketWorldPosition.clone().sub(plugOffset)

  return { position, quaternion }
}

export function quaternionToEuler(q: THREE.Quaternion): [number, number, number] {
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ')
  return [e.x, e.y, e.z]
}

/**
 * Calculates the world transform for a child part to snap to a parent part's connector,
 * applying rotations relative to the socket's local coordinate system.
 */
export function calculateSnapTransform(
  socketWorldPos: THREE.Vector3,
  socketWorldQuat: THREE.Quaternion,
  plugLocalPos: THREE.Vector3,
  plugLocalQuat: THREE.Quaternion,
  // Angles for local rotation adjustments
  liftAngle: number = 0, // Pitch: Rotation around socket's local X-axis
  rollAngle: number = 0, // Roll: Rotation around socket's local Z-axis
  yawAngle: number = 0, // Yaw: Rotation around socket's local Y-axis
) {
  // --- 1. Define Local Axes based on Socket's Orientation ---
  const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(socketWorldQuat)
  const localY = new THREE.Vector3(0, 1, 0).applyQuaternion(socketWorldQuat)
  const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(socketWorldQuat)

  // --- 2. Create Quaternions for Each Local Rotation ---
  // Base alignment: 180-degree flip around the socket's LOCAL Z-axis to align Z axes.
  const flipQuat = new THREE.Quaternion().setFromAxisAngle(localZ, Math.PI)

  // Create quaternions for lift, roll, and yaw around the socket's LOCAL axes.
  const liftQuat = new THREE.Quaternion().setFromAxisAngle(localX, liftAngle)
  const rollQuat = new THREE.Quaternion().setFromAxisAngle(localZ, rollAngle)
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(localY, yawAngle)

  // --- 3. Combine Rotations in Correct Order ---
  // Start with the socket's orientation, then apply all adjustments.
  // Order: Base Flip -> Yaw -> Lift -> Roll
  const targetConnectorWorldQuat = socketWorldQuat
    .clone()
    .multiply(flipQuat)
    .multiply(yawQuat)
    .multiply(liftQuat)
    .multiply(rollQuat)

  // --- 4. Calculate Final Part Transform (Same as before) ---
  const partBTargetQuat = targetConnectorWorldQuat.clone().multiply(plugLocalQuat.clone().invert())
  const plugOffsetRotated = plugLocalPos.clone().applyQuaternion(partBTargetQuat)
  const partBTargetPos = socketWorldPos.clone().sub(plugOffsetRotated)

  return {
    position: partBTargetPos,
    quaternion: partBTargetQuat,
  }
}
