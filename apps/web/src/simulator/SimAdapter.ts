/**
 * SimAdapter — 仿真适配器，实现 DroneAdapter 接口。
 *
 * 消费 CommandProgram IR，在内存中用轻量运动学模型模拟无人机飞行。
 * 通过 ExecHooks 回调输出 Telemetry（位置/朝向/传感器读数）和 RunResult。
 *
 * 硬件解耦红线：SimAdapter 只通过 CommandProgram 与积木编辑器通信。
 * 换真机只需实现另一个 DroneAdapter，不改积木、不改课程。
 */
import type {
  DroneAdapter,
  CommandProgram,
  Command,
  ExecHooks,
  Telemetry,
  RunResult,
  Condition,
  Axis,
} from '@fwx/shared'

/** Simulated drone state */
interface DroneState {
  pos: [number, number, number]     // [x, y, z] in cm
  heading: number                    // degrees, 0 = forward (+Z)
  isFlying: boolean
  lockedAxes: Set<Axis>
  ledColor: [number, number, number]
}

/** Obstacle for collision detection */
export interface SimObstacle {
  posCm: [number, number, number]
  radiusCm: number
}

export interface SimAdapterOptions {
  /** Speed multiplier (1 = realtime, 2 = 2x speed) */
  speed?: number
  /** Obstacles in the scene */
  obstacles?: SimObstacle[]
  /** Tick interval in ms */
  tickMs?: number
}

export class SimAdapter implements DroneAdapter {
  private state: DroneState
  private running = false
  private aborted = false
  private hooks: ExecHooks = {}
  private obstacles: SimObstacle[]
  private speed: number
  private tickMs: number
  private events: string[] = []
  private commandIndex = 0

  constructor(options: SimAdapterOptions = {}) {
    this.speed = options.speed ?? 1
    this.tickMs = options.tickMs ?? 50
    this.obstacles = options.obstacles ?? []
    this.state = {
      pos: [0, 0, 0],
      heading: 0,
      isFlying: false,
      lockedAxes: new Set(),
      ledColor: [0, 0, 0],
    }
  }

  async execute(program: CommandProgram, hooks: ExecHooks): Promise<void> {
    this.hooks = hooks
    this.running = true
    this.aborted = false
    this.events = []
    this.commandIndex = 0
    this.state.pos = [0, 0, 0]
    this.state.heading = 0
    this.state.isFlying = false
    this.state.lockedAxes.clear()

    try {
      await this.runCommands(program.commands)

      const result: RunResult = {
        success: !this.aborted,
        events: this.events,
      }
      this.hooks.onFinish?.(result)
    } catch (err) {
      const result: RunResult = {
        success: false,
        events: [...this.events, `Error: ${err instanceof Error ? err.message : 'unknown'}`],
      }
      this.hooks.onFinish?.(result)
    } finally {
      this.running = false
    }
  }

  stop(): void {
    this.aborted = true
    this.running = false
  }

  isRunning(): boolean {
    return this.running
  }

  getState(): Readonly<DroneState> {
    return this.state
  }

  // ===== Command execution =====

  private async runCommands(commands: Command[]): Promise<void> {
    for (const cmd of commands) {
      if (this.aborted) return
      this.hooks.onCommandStart?.(this.commandIndex, cmd)
      this.commandIndex++
      await this.runCommand(cmd)
    }
  }

  private async runCommand(cmd: Command): Promise<void> {
    switch (cmd.type) {
      case 'takeoff': {
        this.state.isFlying = true
        await this.animateMove(0, cmd.params.altitudeCm, 0, 30)
        this.events.push(`takeoff to ${cmd.params.altitudeCm}cm`)
        break
      }
      case 'land': {
        await this.animateMove(0, -this.state.pos[1], 0, 30)
        this.state.isFlying = false
        this.events.push('landed')
        break
      }
      case 'move': {
        const { direction, distanceCm, speedCmS } = cmd.params
        const speed = speedCmS ?? 30
        const [dx, dy, dz] = this.directionToVector(direction, distanceCm)

        // Check locked axes
        if (this.state.lockedAxes.has('forward') && dz !== 0) {
          this.events.push(`move ${direction} blocked (forward axis locked)`)
          break
        }
        if (this.state.lockedAxes.has('lateral') && dx !== 0) {
          this.events.push(`move ${direction} blocked (lateral axis locked)`)
          break
        }
        if (this.state.lockedAxes.has('vertical') && dy !== 0) {
          this.events.push(`move ${direction} blocked (vertical axis locked)`)
          break
        }

        await this.animateMove(dx, dy, dz, speed)
        this.events.push(`move ${direction} ${distanceCm}cm`)
        break
      }
      case 'rotate': {
        const targetHeading = this.state.heading + cmd.params.degrees
        const steps = Math.max(1, Math.abs(cmd.params.degrees) / 5)
        const stepDeg = cmd.params.degrees / steps

        for (let i = 0; i < steps && !this.aborted; i++) {
          this.state.heading += stepDeg
          this.emitTelemetry()
          await this.sleep(this.tickMs)
        }
        this.state.heading = targetHeading
        this.events.push(`rotate ${cmd.params.degrees}deg`)
        break
      }
      case 'hover': {
        const duration = cmd.params.durationMs / this.speed
        const ticks = Math.ceil(duration / this.tickMs)
        for (let i = 0; i < ticks && !this.aborted; i++) {
          this.emitTelemetry()
          await this.sleep(this.tickMs)
        }
        this.events.push(`hover ${cmd.params.durationMs}ms`)
        break
      }
      case 'led': {
        this.state.ledColor = [cmd.params.r, cmd.params.g, cmd.params.b]
        this.emitTelemetry()
        this.events.push(`led (${cmd.params.r},${cmd.params.g},${cmd.params.b})`)
        break
      }
      case 'waitUntil': {
        let waited = 0
        const maxWait = 10000 // 10s max
        while (!this.aborted && waited < maxWait) {
          if (this.evaluateCondition(cmd.params.condition)) {
            this.events.push(`waitUntil ${cmd.params.condition.sensor} ${cmd.params.condition.op} ${cmd.params.condition.value} — triggered`)
            break
          }
          this.emitTelemetry()
          await this.sleep(this.tickMs)
          waited += this.tickMs
        }
        break
      }
      case 'lockAxis': {
        this.state.lockedAxes.clear()
        for (const axis of cmd.params.axes) {
          this.state.lockedAxes.add(axis)
        }
        this.events.push(`lockAxis [${cmd.params.axes.join(',')}]`)
        break
      }
      case 'ifElse': {
        const condMet = this.evaluateCondition(cmd.params.condition)
        if (condMet) {
          await this.runCommands(cmd.params.then)
        } else if (cmd.params.else) {
          await this.runCommands(cmd.params.else)
        }
        break
      }
      case 'repeat': {
        for (let i = 0; i < cmd.params.times && !this.aborted; i++) {
          await this.runCommands(cmd.params.body)
        }
        break
      }
      case 'while': {
        let iterations = 0
        const maxIter = 1000
        while (!this.aborted && iterations < maxIter && this.evaluateCondition(cmd.params.condition)) {
          await this.runCommands(cmd.params.body)
          iterations++
        }
        break
      }
    }
  }

  // ===== Helpers =====

  private directionToVector(direction: string, distance: number): [number, number, number] {
    const rad = (this.state.heading * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)

    switch (direction) {
      case 'forward': return [sin * distance, 0, cos * distance]
      case 'back':    return [-sin * distance, 0, -cos * distance]
      case 'left':    return [-cos * distance, 0, sin * distance]
      case 'right':   return [cos * distance, 0, -sin * distance]
      case 'up':      return [0, distance, 0]
      case 'down':    return [0, -distance, 0]
      default:        return [0, 0, 0]
    }
  }

  private async animateMove(dx: number, dy: number, dz: number, speedCmS: number): Promise<void> {
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist === 0) return

    const duration = (dist / speedCmS) * 1000 / this.speed
    const steps = Math.max(1, Math.ceil(duration / this.tickMs))
    const sx = dx / steps
    const sy = dy / steps
    const sz = dz / steps

    for (let i = 0; i < steps && !this.aborted; i++) {
      this.state.pos[0] += sx
      this.state.pos[1] += sy
      this.state.pos[2] += sz
      this.emitTelemetry()
      await this.sleep(this.tickMs)
    }
  }

  private evaluateCondition(cond: Condition): boolean {
    let sensorValue: number

    switch (cond.sensor) {
      case 'frontDistanceCm':
        sensorValue = this.getFrontDistance()
        break
      case 'downDistanceCm':
        sensorValue = Math.max(0, this.state.pos[1])
        break
      case 'battery':
        sensorValue = 80 // simulated battery
        break
      default:
        sensorValue = 0
    }

    switch (cond.op) {
      case '<': return sensorValue < cond.value
      case '>': return sensorValue > cond.value
      case '==': return Math.abs(sensorValue - cond.value) < 1
      default: return false
    }
  }

  private getFrontDistance(): number {
    const [x, y, z] = this.state.pos
    const rad = (this.state.heading * Math.PI) / 180
    const fwd = [Math.sin(rad), 0, Math.cos(rad)]

    let minDist = 9999
    for (const obs of this.obstacles) {
      const dx = obs.posCm[0] - x
      const dz = obs.posCm[2] - z
      // Project obstacle onto forward direction
      const dot = dx * fwd[0] + dz * fwd[2]
      if (dot > 0) {
        const dist = Math.sqrt(dx * dx + dz * dz) - obs.radiusCm
        if (dist < minDist) minDist = dist
      }
    }
    return Math.max(0, minDist)
  }

  private emitTelemetry(): void {
    const t: Telemetry = {
      posCm: [...this.state.pos],
      headingDeg: this.state.heading,
      frontDistanceCm: this.getFrontDistance(),
    }
    this.hooks.onTelemetry?.(t)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
