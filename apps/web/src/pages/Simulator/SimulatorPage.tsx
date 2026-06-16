/**
 * SimulatorPage — 仿真试飞。
 *
 * 消费 CommandProgram IR → SimAdapter 执行 → Three.js 场景渲染飞行。
 * 运行/停止/重置、遥测 HUD、飞行轨迹、障碍物、结果面板（完成/撞机/停止 + 用时）。
 */
import { useCallback, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Activity } from 'lucide-react'
import { Button } from '../../components/common/Button'
import { useToast } from '../../components/common/Toast'
import { FlightScene } from '../../simulator/FlightScene'
import { SimAdapter, type SimObstacle } from '../../simulator/SimAdapter'
import type { Telemetry, RunResult, CommandProgram } from '@fwx/shared'
import { COMMAND_PROTOCOL_VERSION } from '@fwx/shared'
import { useProgramStore } from '../../stores/programStore'
import { SimResultPanel, type SimFinishKind } from './SimResultPanel'

/** 飞行轨迹最多保留点数（防止长飞累积拖慢渲染）。 */
const MAX_TRAIL_POINTS = 300

/** Demo obstacles（heightCm 默认 100，与场景圆柱一致）。 */
const DEFAULT_OBSTACLES: SimObstacle[] = [
  { posCm: [0, 0, 200], radiusCm: 30, heightCm: 100 },
  { posCm: [180, 0, 350], radiusCm: 25, heightCm: 100 },
  { posCm: [-80, 0, 500], radiusCm: 35, heightCm: 100 },
]

/** Demo program: takeoff → fly forward → avoid obstacle → land */
const DEMO_PROGRAM: CommandProgram = {
  version: COMMAND_PROTOCOL_VERSION,
  metadata: { name: '示例飞行', author: '系统', createdAt: new Date().toISOString() },
  commands: [
    { type: 'takeoff', params: { altitudeCm: 100 } },
    { type: 'move', params: { direction: 'forward', distanceCm: 150, speedCmS: 40 } },
    { type: 'led', params: { r: 0, g: 255, b: 0 } },
    { type: 'hover', params: { durationMs: 500 } },
    { type: 'rotate', params: { degrees: 90 } },
    { type: 'move', params: { direction: 'forward', distanceCm: 100, speedCmS: 30 } },
    { type: 'rotate', params: { degrees: -90 } },
    { type: 'move', params: { direction: 'forward', distanceCm: 200, speedCmS: 40 } },
    { type: 'led', params: { r: 0, g: 0, b: 255 } },
    { type: 'land' },
  ],
}

export function SimulatorPage() {
  const toast = useToast()

  const adapterRef = useRef<SimAdapter | null>(null)
  const runIdRef = useRef(0)
  const startTimeRef = useRef(0)
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [trail, setTrail] = useState<[number, number, number][]>([])
  const [ledColor, setLedColor] = useState<[number, number, number]>([0, 0, 0])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)
  const [finishKind, setFinishKind] = useState<SimFinishKind | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [currentCmdIndex, setCurrentCmdIndex] = useState(-1)

  const handleRun = useCallback(async () => {
    // 优先运行用户在编程器里真实保存的程序；没有则回退示例飞行。
    const saved = useProgramStore.getState().commandProgram
    const program = saved && saved.commands.length > 0 ? saved : DEMO_PROGRAM
    if (program === DEMO_PROGRAM) {
      toast.push('info', '未找到已保存的程序，运行示例飞行')
    }

    // 竞态防护：作废上一轮回调，开启新一轮（照搬 useProjectFlight 的 runId 模式）
    adapterRef.current?.stop()
    const myRun = ++runIdRef.current
    const live = () => runIdRef.current === myRun

    const adapter = new SimAdapter({ speed: 1, obstacles: DEFAULT_OBSTACLES, tickMs: 50 })
    adapterRef.current = adapter

    setRunning(true)
    setResult(null)
    setFinishKind(null)
    setTrail([])
    setLedColor([0, 0, 0])
    setCurrentCmdIndex(-1)
    startTimeRef.current = performance.now()

    await adapter.execute(program, {
      onCommandStart: (index) => {
        if (!live()) return
        setCurrentCmdIndex(index)
      },
      onTelemetry: (t) => {
        if (!live()) return
        setTelemetry({ ...t })
        setTrail(prev => {
          const next = [...prev, [...t.posCm] as [number, number, number]]
          return next.length > MAX_TRAIL_POINTS ? next.slice(next.length - MAX_TRAIL_POINTS) : next
        })
        setLedColor([...adapter.getState().ledColor])
      },
      onFinish: (r) => {
        if (!live()) return
        // 三态：撞机 / 完成 / 手动停止。撞机优先于 success 判断。
        const kind: SimFinishKind = adapter.hasCollided() ? 'collision' : r.success ? 'success' : 'stopped'
        setResult(r)
        setFinishKind(kind)
        setElapsedSec((performance.now() - startTimeRef.current) / 1000)
        setRunning(false)
        toast.push(
          kind === 'success' ? 'success' : kind === 'collision' ? 'error' : 'info',
          kind === 'success' ? '飞行完成！' : kind === 'collision' ? '撞到障碍了' : '已停止',
        )
      },
    })
  }, [toast])

  const handleStop = useCallback(() => {
    // 只停飞；最终结果（含用时）由 adapter 的 onFinish 回来统一产出，保证一致。
    adapterRef.current?.stop()
  }, [])

  const handleReset = useCallback(() => {
    runIdRef.current++ // 作废当前 run 的后续回调
    adapterRef.current?.stop()
    setRunning(false)
    setResult(null)
    setFinishKind(null)
    setElapsedSec(0)
    setTelemetry(null)
    setTrail([])
    setLedColor([0, 0, 0])
    setCurrentCmdIndex(-1)
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-sky-100 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          {!running ? (
            <Button size="sm" onClick={handleRun} leftIcon={<Play size={14} />}>
              {finishKind ? '重新运行' : '运行'}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleStop} leftIcon={<Pause size={14} />}>
              停止
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleReset} leftIcon={<RotateCcw size={14} />}>
            重置
          </Button>
        </div>

        {/* Telemetry HUD（移动端隐藏详细数据，保留按钮可用） */}
        {telemetry && (
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-ink-600">
            <span className="inline-flex items-center gap-1">
              <Activity size={12} className="text-sky-400" />
              X:{telemetry.posCm[0].toFixed(0)} Y:{telemetry.posCm[1].toFixed(0)} Z:{telemetry.posCm[2].toFixed(0)}
            </span>
            <span>H:{telemetry.headingDeg.toFixed(0)}°</span>
            <span>前方:{telemetry.frontDistanceCm.toFixed(0)}cm</span>
            {currentCmdIndex >= 0 && <span className="text-sky-500">指令 #{currentCmdIndex + 1}</span>}
          </div>
        )}

        <div className="w-px" aria-hidden="true" />
      </div>

      {/* 3D Scene */}
      <div className="relative min-h-0 flex-1">
        <FlightScene telemetry={telemetry} obstacles={DEFAULT_OBSTACLES} trail={trail} ledColor={ledColor} />

        {/* 结果面板（完成/撞机/停止 + 用时 + 重新运行） */}
        {finishKind && !running && (
          <SimResultPanel kind={finishKind} elapsedSec={elapsedSec} onRerun={handleRun} />
        )}

        {/* Event log overlay */}
        {result && result.events.length > 0 && (
          <div className="absolute bottom-4 left-4 max-h-40 max-w-xs overflow-auto rounded-xl border border-sky-100 bg-white/90 p-3 shadow-soft backdrop-blur">
            <h4 className="mb-1 text-xs font-semibold text-ink-700">飞行日志 ({result.events.length})</h4>
            <ul className="space-y-0.5">
              {result.events.map((evt, i) => (
                <li key={i} className="font-mono text-xs text-ink-500">{evt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
