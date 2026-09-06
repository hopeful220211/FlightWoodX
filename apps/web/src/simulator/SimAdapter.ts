/**
 * SimAdapter — 仿真适配器，实现 DroneAdapter 接口。
 *
 * 消费 CommandProgram IR，在内存中用轻量运动学模型模拟无人机飞行。
 * 通过 ExecHooks 回调输出 Telemetry（位置/朝向/传感器读数）和 RunResult。
 *
 * 硬件解耦红线：SimAdapter 只通过 CommandProgram 与积木编辑器通信。
 * 换真机只需实现另一个 DroneAdapter，不改积木、不改课程。
 */
import { COMMAND_LIMITS, CommandProgramSchema } from '@fwx/shared'
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

/** 无人机碰撞半径（cm）。贴合模型横向≈36cm 的宽松玩法半径。 */
const DRONE_RADIUS_CM = 18

/** Obstacle for collision detection */
export interface SimObstacle {
  posCm: [number, number, number]
  radiusCm: number
  /** 圆柱视觉高度（cm）；预留给未来「飞越障碍顶」玩法，本轮禁飞柱判定不使用。 */
  heightCm?: number
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
  private collided = false
  private failureReason: string | null = null
  private cancelSleep: (() => void) | null = null

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
    if (this.running) throw new Error('程序正在运行，请等待停止后再运行')
    this.hooks = hooks
    this.running = true
    this.aborted = false
    this.events = []
    this.commandIndex = 0
    this.state.pos = [0, 0, 0]
    this.state.heading = 0
    this.state.isFlying = false
    this.state.lockedAxes.clear()
    this.state.ledColor = [0, 0, 0]
    this.collided = false
    this.failureReason = null

    try {
      const parsed = CommandProgramSchema.safeParse(program)
      if (!parsed.success) throw new Error('程序格式不正确，请返回编程页检查积木')
      this.emitTelemetry()
      await this.runCommands(parsed.data.commands)
    } catch (err) {
      this.failureReason = err instanceof Error ? err.message : '程序运行失败'
      this.events.push(this.failureReason)
    } finally {
      this.running = false
    }
    const result: RunResult = { success: !this.aborted && !this.failureReason, events: [...this.events] }
    this.hooks.onFinish?.(result)
  }

  stop(): void {
    if (!this.running || this.aborted) return
    this.aborted = true
    this.events.push('已停止')
    this.cancelSleep?.()
  }

  isRunning(): boolean {
    return this.running
  }

  getState(): Readonly<DroneState> {
    return this.state
  }

  /** 本轮是否因撞击障碍而中止（区别于用户手动停止）。 */
  hasCollided(): boolean {
    return this.collided
  }

  getFailureReason(): string | null { return this.failureReason }

  // ===== Command execution =====

  private async runCommands(commands: Command[]): Promise<void> {
    for (const cmd of commands) {
      if (this.aborted) return
      if (this.commandIndex >= 10_000) throw new Error('运行指令过多，请缩短循环后重试')
      // Yield to browser input even for loops that only contain instantaneous commands.
      if (this.commandIndex > 0 && this.commandIndex % 50 === 0) await this.sleep(0)
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
        await this.animateMove(0, cmd.params.altitudeCm - this.state.pos[1], 0, 30)
        if (this.aborted) break
        this.events.push(`takeoff to ${cmd.params.altitudeCm}cm`)
        break
      }
      case 'land': {
        await this.animateMove(0, -this.state.pos[1], 0, 30)
        if (this.aborted) break
        this.state.isFlying = false
        this.events.push('landed')
        break
      }
      case 'move': {
        const { direction, distanceCm, speedCmS } = cmd.params
        const speed = speedCmS ?? 30
        const [dx, dy, dz] = this.directionToVector(direction, distanceCm)

        // Check locked axes
        if (this.state.lockedAxes.has('forward') && ['forward', 'back'].includes(direction)) {
          this.events.push(`move ${direction} blocked (forward axis locked)`)
          break
        }
        if (this.state.lockedAxes.has('lateral') && ['left', 'right'].includes(direction)) {
          this.events.push(`move ${direction} blocked (lateral axis locked)`)
          break
        }
        if (this.state.lockedAxes.has('vertical') && dy !== 0) {
          this.events.push(`move ${direction} blocked (vertical axis locked)`)
          break
        }

        await this.animateMove(dx, dy, dz, speed)
        if (this.aborted) break // 撞机/停止：不记该指令为完成
        this.events.push(`move ${direction} ${distanceCm}cm`)
        break
      }
      case 'rotate': {
        const startHeading = this.state.heading
        const steps = Math.max(1, Math.ceil(Math.abs(cmd.params.degrees) / 5))
        await this.animateFor(steps * this.tickMs / this.speed, progress => {
          this.state.heading = startHeading + cmd.params.degrees * progress
        })
        if (this.aborted) break
        this.events.push(`rotate ${cmd.params.degrees}deg`)
        break
      }
      case 'hover': {
        await this.animateFor(cmd.params.durationMs / this.speed, () => {})
        if (this.aborted) break
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
        const deadline = performance.now() + 10000
        while (!this.aborted) {
          if (this.evaluateCondition(cmd.params.condition)) {
            this.events.push(`waitUntil ${cmd.params.condition.sensor} ${cmd.params.condition.op} ${cmd.params.condition.value} — triggered`)
            break
          }
          const remaining = deadline - performance.now()
          if (remaining <= 0) throw new Error('等待条件在 10 秒内未满足，程序已停止')
          this.emitTelemetry()
          await this.sleep(Math.max(1, Math.min(this.tickMs, Math.ceil(remaining))))
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
        const maxIter = Math.min(
          cmd.params.maxIterations ?? COMMAND_LIMITS.maxWhileIterations,
          COMMAND_LIMITS.maxWhileIterations,
        )
        while (!this.aborted && iterations < maxIter && this.evaluateCondition(cmd.params.condition)) {
          await this.runCommands(cmd.params.body)
          iterations++
        }
        if (!this.aborted && iterations >= maxIter && this.evaluateCondition(cmd.params.condition)) {
          throw new Error(`循环达到 ${maxIter} 次上限，程序已停止`)
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
    const [x, y, z] = this.state.pos
    await this.animateFor(duration, progress => {
      this.advancePosition([x + dx * progress, y + dy * progress, z + dz * progress])
    })
  }

  /** Timers schedule updates; elapsed monotonic time, not callback count, sets progress. */
  private async animateFor(durationMs: number, update: (progress: number) => void): Promise<void> {
    const started = performance.now()
    while (!this.aborted) {
      const elapsed = performance.now() - started
      const progress = durationMs > 0 ? Math.min(1, elapsed / durationMs) : 1
      update(progress)
      this.emitTelemetry()
      if (progress >= 1 || this.aborted) return
      await this.sleep(Math.max(1, Math.min(this.tickMs, Math.ceil(durationMs - elapsed))))
    }
  }

  /** Sweep the whole XZ segment so a late update cannot jump through a forbidden column. */
  private advancePosition(next: [number, number, number]): void {
    const start = this.state.pos
    const delta = next.map((value, axis) => value - start[axis])
    const a = delta[0] ** 2 + delta[2] ** 2
    let firstHit = Infinity
    if (a > 0) {
      for (const obstacle of this.obstacles) {
        const x = start[0] - obstacle.posCm[0]
        const z = start[2] - obstacle.posCm[2]
        const radius = obstacle.radiusCm + DRONE_RADIUS_CM
        const b = 2 * (x * delta[0] + z * delta[2])
        const c = x * x + z * z - radius * radius
        const discriminant = b * b - 4 * a * c
        if (c < 0) { firstHit = 0; break }
        if (discriminant <= 0) continue
        const entry = (-b - Math.sqrt(discriminant)) / (2 * a)
        if (entry >= 0 && entry < 1) firstHit = Math.min(firstHit, entry)
      }
    }
    if (firstHit !== Infinity) {
      this.state.pos = [
        start[0] + delta[0] * firstHit,
        start[1] + delta[1] * firstHit,
        start[2] + delta[2] * firstHit,
      ]
      this.collided = true
      this.aborted = true
      this.events.push('💥 撞到障碍物')
    } else {
      this.state.pos = next
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
    const [x, , z] = this.state.pos
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
    // 碰撞检测：覆盖所有有遥测的阶段；撞机后置 aborted 让各循环自然退出
    if (!this.collided && this.checkCollision()) {
      this.collided = true
      this.aborted = true
      this.events.push('💥 撞到障碍物')
    }
  }

  /**
   * 碰撞判定：障碍为「地面禁飞柱」，无人机 XZ 水平进入柱体即撞（本轮 MVP）。
   * 「飞越障碍顶」属高级玩法，本轮延后（届时按 obstacle.heightCm 做 Y 区间判定）。
   */
  private checkCollision(): boolean {
    const [x, , z] = this.state.pos
    for (const obs of this.obstacles) {
      const dx = obs.posCm[0] - x
      const dz = obs.posCm[2] - z
      if (Math.sqrt(dx * dx + dz * dz) < obs.radiusCm + DRONE_RADIUS_CM) return true
    }
    return false
  }

  private sleep(ms: number): Promise<void> {
    if (this.aborted) return Promise.resolve()
    return new Promise(resolve => {
      const finish = () => {
        clearTimeout(timer)
        this.cancelSleep = null
        resolve()
      }
      const timer = setTimeout(finish, ms)
      this.cancelSleep = finish
    })
  }
}
