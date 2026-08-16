import * as THREE from 'three'

// ============= Tuning Constants =============
// Adjust these to change flight feel. Refresh to test.
const MAX_THRUST = 2.0       // m/s² max acceleration
const MAX_ANGULAR = 1.5      // rad/s² max angular acceleration
const LINEAR_DAMPING = 0.95  // per-frame velocity decay (0.9 = heavy, 0.99 = slippery)
const ANGULAR_DAMPING = 0.92 // per-frame angular velocity decay
const MAX_SPEED = 3.0        // m/s speed cap
const MIN_HEIGHT = 0.1       // meters
const MAX_HEIGHT = 5.0       // meters
const VISUAL_TILT = 0.1      // visual pitch/roll multiplier

export interface DroneState {
  position: THREE.Vector3
  velocity: THREE.Vector3
  rotationY: number
  angularVelocity: number
}

export interface FlightInput {
  leftX: number   // -1..1 strafe
  leftY: number   // -1..1 altitude
  rightX: number  // -1..1 yaw
  rightY: number  // -1..1 forward/back
}

export function createInitialState(): DroneState {
  return {
    position: new THREE.Vector3(0, 0.5, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    rotationY: 0,
    angularVelocity: 0,
  }
}

/**
 * Advance drone physics by one frame.
 * Mutates state in place for performance (called 60x/sec).
 */
export function updatePhysics(state: DroneState, input: FlightInput, dt: number): void {
  // Clamp dt to prevent physics explosion on tab-switch
  const clampedDt = Math.min(dt, 0.05)

  // Target acceleration in drone-local space
  const localAcc = new THREE.Vector3(
    input.leftX * MAX_THRUST,     // strafe left/right
    input.leftY * MAX_THRUST,     // altitude up/down
    -input.rightY * MAX_THRUST,   // forward/back (-Z is forward)
  )

  // Rotate acceleration by drone's current heading
  localAcc.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.rotationY)

  // Yaw from right stick X
  const targetAngular = -input.rightX * MAX_ANGULAR

  // Apply acceleration
  state.velocity.add(localAcc.multiplyScalar(clampedDt))

  // Apply damping (drag)
  state.velocity.multiplyScalar(LINEAR_DAMPING)

  // Angular velocity
  state.angularVelocity = state.angularVelocity * ANGULAR_DAMPING + targetAngular * clampedDt

  // Speed cap
  if (state.velocity.length() > MAX_SPEED) {
    state.velocity.setLength(MAX_SPEED)
  }

  // Integrate position and rotation
  state.position.add(state.velocity.clone().multiplyScalar(clampedDt))
  state.rotationY += state.angularVelocity * clampedDt

  // Height clamp
  state.position.y = THREE.MathUtils.clamp(state.position.y, MIN_HEIGHT, MAX_HEIGHT)
}

/**
 * Compute visual tilt angles (pitch + roll) from velocity.
 * These are purely cosmetic — don't feed back into physics.
 */
export function getVisualTilt(state: DroneState): { pitch: number; roll: number } {
  return {
    pitch: -state.velocity.z * VISUAL_TILT,
    roll: -state.velocity.x * VISUAL_TILT,
  }
}
